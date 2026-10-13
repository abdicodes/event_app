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
      const openPolls = await tx<{
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
        WHERE
          (p.starts_at IS NULL OR p.starts_at <= now())
          AND (p.ends_at IS NULL OR p.ends_at >= now())
          AND NOT EXISTS (
            SELECT 1
            FROM poll_submissions ps
            WHERE ps.poll_id = p.id
              AND ps.guest_id = ${guest.id}
          )
        ORDER BY p.id
        FOR UPDATE OF p
      `;

      if (!openPolls.length) {
        throw Object.assign(
          new Error(
            "There are no open polls remaining to submit",
          ),
          { status: 409 },
        );
      }

      const expectedPollIds = openPolls
        .map(poll => poll.id)
        .sort((a, b) => a - b);

      const submittedPollIds = votes
        .map(vote => vote.pollId)
        .sort((a, b) => a - b);

      if (
        expectedPollIds.length !==
          submittedPollIds.length ||
        expectedPollIds.some(
          (id, index) =>
            id !== submittedPollIds[index],
        )
      ) {
        throw Object.assign(
          new Error(
            "The available polls changed. Refresh the voting page and try again.",
          ),
          { status: 409 },
        );
      }

      const votesByPoll = new Map(
        votes.map(vote => [
          vote.pollId,
          vote.optionIds,
        ]),
      );

      for (const poll of openPolls) {
        const optionIds =
          votesByPoll.get(poll.id) || [];

        const countError =
          validateSelectionCount(
            poll.choice_mode,
            optionIds.length,
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
                  optionIds,
                  POSTGRES_INT4_OID,
                )}
              )
          `;

        if (
          validOptions.length !==
          optionIds.length
        ) {
          throw Object.assign(
            new Error(
              `${poll.title}: one or more selected options are invalid`,
            ),
            { status: 400 },
          );
        }
      }

      for (const poll of openPolls) {
        const optionIds =
          votesByPoll.get(poll.id) || [];

        for (const optionId of optionIds) {
          await tx`
            INSERT INTO poll_votes(
              poll_id,
              guest_id,
              option_id
            )
            VALUES(
              ${poll.id},
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
            ${poll.id},
            ${guest.id}
          )
        `;
      }

      return {
        ok: true,
        submitted: openPolls.length,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error?.code === "23505") {
      return NextResponse.json(
        {
          error:
            "One or more votes have already been submitted. Refresh the page and try again.",
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
