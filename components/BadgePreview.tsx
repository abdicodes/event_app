import { ROLE_STYLE, resolveBadgeRole, type RoleCode } from "@/lib/roles";

export default function BadgePreview({name,badgeCode,roles}:{name:string;badgeCode:string;roles:RoleCode[]}){
  const badgeRole=resolveBadgeRole(roles);
  const style=ROLE_STYLE[badgeRole];
  return <div className="badge-design" style={{backgroundImage:`url(${style.template})`}} aria-label={`${name} badge`}>
    <div className="badge-role-stack">{roles.slice(0,2).map(role=><span key={role} style={{background:ROLE_STYLE[role].color,color:ROLE_STYLE[role].textColor}}>{ROLE_STYLE[role].label}</span>)}</div>
    <div className="badge-person-name">{name}</div>
    <img className="badge-design-qr" src={`/api/qr/${encodeURIComponent(badgeCode)}`} alt=""/>
  </div>;
}
