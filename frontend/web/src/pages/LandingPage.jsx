import { Link } from 'react-router-dom';
import { usePublicSiteConfig } from '../hooks/usePublicSiteConfig';

export default function LandingPage() {
  const { data } = usePublicSiteConfig();
  const { branding, landing, announcements } = data;

  return (
    <div className="min-h-screen landing-animated-bg bg-[radial-gradient(circle_at_top_left,_rgba(5,150,105,0.22),_transparent_30%),linear-gradient(135deg,#f8fafc,#ecfeff_50%,#f8fafc)] text-slate-900">
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/70 border-b border-slate-200/70 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={branding.logoUrl || '/icon.svg'} alt={branding.appName} className="w-11 h-11 rounded-2xl shadow-lg object-cover" />
            <div>
              <p className="font-semibold text-lg leading-none">{branding.appName}</p>
              <p className="text-sm text-slate-500">{branding.tagline}</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm rounded-full border border-slate-300 hover:bg-white transition-all hover:-translate-y-0.5">Login</Link>
            <Link to="/signup" className="px-5 py-2.5 text-sm rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-all hover:-translate-y-0.5">Create account</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-[1.15fr_0.85fr] gap-10 items-center">
          <div className="landing-fade-up">
            {announcements?.length > 0 && (
              <div className="mb-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {announcements[0].title}
              </div>
            )}
            <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.02] max-w-3xl">{landing.heroTitle}</h1>
            <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-8">{landing.heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={landing.primaryCtaHref || '/login'} className="px-6 py-3 rounded-full bg-slate-950 text-white shadow-xl shadow-slate-900/15 hover:bg-slate-800 transition-all hover:-translate-y-0.5">{landing.primaryCtaLabel || 'Login'}</Link>
              <Link to={landing.secondaryCtaHref || '/signup'} className="px-6 py-3 rounded-full bg-white border border-slate-300 hover:bg-slate-50 transition-all hover:-translate-y-0.5">{landing.secondaryCtaLabel || 'Sign Up'}</Link>
              <Link to={landing.tertiaryCtaHref || '/forgot-password'} className="px-6 py-3 rounded-full text-slate-600 hover:text-slate-900 transition-all hover:-translate-y-0.5">{landing.tertiaryCtaLabel || 'Forgot Password'}</Link>
            </div>
            <div className="mt-10 grid md:grid-cols-3 gap-4 max-w-3xl">
              {(landing.statCards || []).map((card, index) => (
                <div key={`${card.label}-${index}`} className="rounded-2xl bg-white/80 backdrop-blur border border-slate-200 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg landing-stagger-in" style={{ animationDelay: `${index * 90}ms` }}>
                  <p className="text-3xl font-semibold">{card.value}</p>
                  <p className="text-sm text-slate-500 mt-1">{card.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative landing-fade-up" style={{ animationDelay: '120ms' }}>
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400/20 via-cyan-300/10 to-slate-900/10 blur-3xl scale-90 landing-float" />
            <div className="relative rounded-[2rem] border border-white/70 bg-white/80 backdrop-blur-xl shadow-2xl p-6">
              <div className="rounded-[1.5rem] bg-slate-950 px-6 py-7 text-white overflow-hidden relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.35),_transparent_30%)]" />
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <img src={landing.heroImageUrl || branding.logoUrl || '/guff-handim-logo.svg'} alt="Hero" className="w-16 h-16 rounded-2xl object-cover bg-white/10 p-2" />
                    <div>
                      <p className="text-lg font-semibold">{branding.appName}</p>
                      <p className="text-sm text-slate-300">Encrypted communication platform</p>
                    </div>
                  </div>
                  <div className="mt-8 space-y-3">
                    {(landing.featureCards || []).map((card, index) => (
                      <div key={`${card.title}-${index}`} className="rounded-2xl bg-white/8 border border-white/10 p-4">
                        <p className="font-medium">{card.title}</p>
                        <p className="text-sm text-slate-300 mt-1">{card.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 pb-20 landing-fade-up" style={{ animationDelay: '180ms' }}>
          <div className="grid md:grid-cols-3 gap-5">
            {(landing.featureCards || []).map((card, index) => (
              <div key={`${card.title}-secondary-${index}`} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:-translate-y-1 transition-all duration-300 hover:shadow-xl landing-stagger-in" style={{ animationDelay: `${index * 120}ms` }}>
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold mb-4">{index + 1}</div>
                <h3 className="text-xl font-semibold">{card.title}</h3>
                <p className="text-slate-600 mt-2 leading-7">{card.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row gap-3 items-center justify-between text-sm text-slate-500">
          <p>{landing.footerText}</p>
          <div className="flex items-center gap-4">
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
            <Link to="/forgot-password">Forgot Password</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
