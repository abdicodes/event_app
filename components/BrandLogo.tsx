export default function BrandLogo({compact=false}:{compact?:boolean}){
  return <img
    className={compact?"site-brand-logo compact":"site-brand-logo"}
    src="/brand-logo.png"
    alt="Global Sumud Flotilla"
  />;
}
