import type { Project } from "../../types/project";

export function ProjectThumbnail({ variant, compact = false }: { variant: Project["thumbnail"]; compact?: boolean }) {
  return (
    <div className={`project-thumb thumb-${variant} ${compact ? "thumb-compact" : ""}`} aria-hidden="true">
      {variant === "landing" && <div className="thumb-landing-page"><div className="thumb-mini-nav"><b><i />NovaGrow</b><span>Home &nbsp; Features &nbsp; Pricing</span><em>Get Started</em></div><div className="thumb-landing-body"><div><small>THE FUTURE OF LIVING</small><strong>Grow a Greener<br /><span>Tomorrow</span></strong><p>Small choices. A beautiful difference.</p><i className="thumb-cta" /></div><img src="/images/plant-hero.jpg" alt="" /></div><div className="thumb-metrics"><i /><i /><i /><i /></div></div>}
      {variant === "mobile" && <div className="thumb-phone"><div className="phone-top"><span>9:41</span><span>•••</span></div><small>Good morning, Alex</small><b>Your money, in motion.</b><div className="phone-balance"><small>Total balance</small><strong>$24,680.50</strong><span>+ 12.8% this month</span></div><div className="phone-actions"><i /><i /><i /></div><div className="phone-row" /><div className="phone-row short" /></div>}
      {variant === "portfolio" && <div className="thumb-portfolio-page"><div className="portfolio-nav"><b>FORM / STUDIO</b><span>WORK &nbsp; ABOUT &nbsp; CONTACT</span></div><div className="portfolio-type">Good work<br />starts with<br /><em>curiosity.</em></div><div className="portfolio-bottom"><div /><div /></div></div>}
      {variant === "dashboard" && <div className="thumb-dashboard-page"><div className="dash-side"><i /><i /><i /><i /></div><div className="dash-main"><small>OVERVIEW / 2026</small><b>Welcome back, Alex.</b><div className="dash-charts"><div><span>Revenue</span><strong>$84,254</strong><div className="dash-bars"><i /><i /><i /><i /><i /><i /><i /><i /></div></div><div><span>Customers</span><strong>12,840</strong><div className="dash-donut" /></div></div><div className="dash-row" /><div className="dash-row" /></div></div>}
      {variant === "social" && <div className="thumb-social-page"><small>THE GOOD SHOP</small><b>Objects for a<br />life well lived.</b><div className="social-shape" /><span>COLLECTION / 01</span></div>}
    </div>
  );
}