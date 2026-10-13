import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { resolveGuestCredential } from "@/lib/guest-access";
import { validateSelectionCount } from "@/lib/polls";

type VoteItem = {
  pollId?: unknown;
  optionIds?: unknown;
};

type VoteAllRequestBody = {
  credential?: unknown;
  votes?: unknown;
};

type ParsedVote = {
  pollId: number;
  optionIds: number[];
};

const POSTGRES_INT4_OID = 23;

function parseVotes(value: unknown): ParsedVote[] | null {
  if (!Array.isArray(value) || value.length < 1) {
    return null;
  }

  const parsed: ParsedVote[] = [];

  for (const item of value as VoteItem[]) {
    const pollId = Number(item?.pollId);

    if (!Number.isInteger(pollId) || pollId < 1) {
      return null;
    }

    if (!Array.isArray(item?.optionIds)) {
      return null;
    }

    const optionIds = Array.from(
      new Set(
        item.optionIds
          .map((optionId: unknown) => Number(optionId))
          .filter(
            (optionId: number) =>
              Number.isInteger(optionId) && optionId > 0,
          ),
      ),
    );

    if (!optionIds.length) {
      return null;
    }

    parsed.push({
      pollId,
      optionIds,
    });
  }

  if (
    new Set(parsed.map(vote => vote.pollId)).size !==
    parsed.length
  ) {
    return null;
  }

  return parsed;
}

export async function POST(request: Request) {
  if (!(await assertSameOrigin(request))) {
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 },
    );
  }

  const body = (
    await request.json().catch(() => ({}))
  ) as VoteAllRequestBody;

  const votes = parseVotes(body.votes);

  if (!votes) {
    return NextResponse.json(
      { error: "Invalid vote request" },
      { status: 400 },
    );
  }

  const guest = await resolveGuestCredential(
    typeof body.credential === "string"
      ? body.credential
      : "",
  );

  if (!guest) {
    return NextResponse.json(
      { error: "Badge not recognized" },
      { status: 404 },
    );
  }

  try {
    const result = await sql.begin(async tx => {
      /*
       * Validate only the polls that the voter actually received on the page
       * and submitted in this batch.
       *
       * We intentionally do NOT compare this list with every poll that happens
       * to be open at the exact server-side submission moment. A poll can open,
       * close, be registered, or otherwise change after the voting page was
       * loaded, which previously caused the false
       * "The available polls changed" error.
       */
      for (const vote of votes) {
        const poll = (
          await tx<{
            id: number;
            title: string;
            choice_mode: "SINGLE" | "MULTIPLE";
            min_selections: number;
            max_selections: number;
          }[]>`
            SELECT
              p.id,
              p.title,
              p.choice_mode,
              p.min_selections,
              p.max_selections
            FROM polls p
            JOIN poll_guests pg
              ON pg.poll_id = p.id
              AND pg.guest_id = ${guest.id}
            WHERE p.id = ${vote.pollId}
              AND (p.starts_at IS NULL OR p.starts_at <= now())
              AND (p.ends_at IS NULL OR p.ends_at >= now())
          `
        )[0];

        if (!poll) {
          throw Object.assign(
            new Error(
              "One of the polls is no longer available. Refresh the voting page and try again.",
            ),
            { status: 409 },
          );
        }

        const alreadySubmitted = (
          await tx`
            SELECT 1
            FROM poll_submissions
            WHERE poll_id = ${poll.id}
              AND guest_id = ${guest.id}
            LIMIT 1
          `
        )[0];

        if (alreadySubmitted) {
          throw Object.assign(
            new Error(
              `"${poll.title}" has already been submitted. Refresh the voting page and try again.`,
            ),
            { status: 409 },
          );
        }

        const countError = validateSelectionCount(
          poll.choice_mode,
          vote.optionIds.length,
          poll.min_selections,
          poll.max_selections,
        );

        if (countError) {
          throw Object.assign(
            new Error(
              `${poll.title}: ${countError}`,
            ),
            { status: 400 },
          );
        }

        const validOptions =
          await tx<{ id: number }[]>`
            SELECT id
            FROM poll_options
            WHERE poll_id = ${poll.id}
              AND id = ANY(
                ${tx.array(
                  vote.optionIds,
                  POSTGRES_INT4_OID,
                )}
              )
          `;

        if (
          validOptions.length !==
          vote.optionIds.length
        ) {
          throw Object.assign(
            new Error(
              `${poll.title}: one or more selected options are invalid`,
            ),
            { status: 400 },
          );
        }
      }

      /*
       * Only after every poll has passed validation do we write anything.
       * Because this is inside one PostgreSQL transaction, either the entire
       * batch is saved or the entire batch is rolled back.
       */
      for (const vote of votes) {
        for (const optionId of vote.optionIds) {
          await tx`
            INSERT INTO poll_votes(
              poll_id,
              guest_id,
              option_id
            )
            VALUES(
              ${vote.pollId},
              ${guest.id},
              ${optionId}
            )
          `;
        }

        await tx`
          INSERT INTO poll_submissions(
            poll_id,
            guest_id
          )
          VALUES(
            ${vote.pollId},
            ${guest.id}
          )
        `;
      }

      return {
        ok: true,
        submitted: votes.length,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.code === "23505") {
      return NextResponse.json(
        {
          error:
            "One or more votes were already submitted. Refresh the voting page and try again.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Could not submit all votes",
      },
      {
        status: error?.status || 500,
      },
    );
  }
}
