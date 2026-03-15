import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import OTPVerify from '../components/Auth/OTPVerify';
import ProfileSetup from '../components/Auth/ProfileSetup';
import { useAuthStore } from '../store/authStore';
import { usePublicSiteConfig } from '../hooks/usePublicSiteConfig';
import api from '../utils/api';
import { ensureEncryptionKeys } from '../utils/ensureKeys';

const MODES = {
  '/login': 'login',
  '/signup': 'signup',
  '/forgot-password': 'forgot',
};

const COUNTRY_CODES = [
  { code: '+93', label: 'Afghanistan (+93)' },
  { code: '+355', label: 'Albania (+355)' },
  { code: '+213', label: 'Algeria (+213)' },
  { code: '+1684', label: 'American Samoa (+1684)' },
  { code: '+376', label: 'Andorra (+376)' },
  { code: '+244', label: 'Angola (+244)' },
  { code: '+1264', label: 'Anguilla (+1264)' },
  { code: '+1268', label: 'Antigua and Barbuda (+1268)' },
  { code: '+54', label: 'Argentina (+54)' },
  { code: '+374', label: 'Armenia (+374)' },
  { code: '+297', label: 'Aruba (+297)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+43', label: 'Austria (+43)' },
  { code: '+994', label: 'Azerbaijan (+994)' },
  { code: '+1242', label: 'Bahamas (+1242)' },
  { code: '+973', label: 'Bahrain (+973)' },
  { code: '+880', label: 'Bangladesh (+880)' },
  { code: '+1246', label: 'Barbados (+1246)' },
  { code: '+375', label: 'Belarus (+375)' },
  { code: '+32', label: 'Belgium (+32)' },
  { code: '+501', label: 'Belize (+501)' },
  { code: '+229', label: 'Benin (+229)' },
  { code: '+1441', label: 'Bermuda (+1441)' },
  { code: '+975', label: 'Bhutan (+975)' },
  { code: '+591', label: 'Bolivia (+591)' },
  { code: '+387', label: 'Bosnia and Herzegovina (+387)' },
  { code: '+267', label: 'Botswana (+267)' },
  { code: '+55', label: 'Brazil (+55)' },
  { code: '+1284', label: 'British Virgin Islands (+1284)' },
  { code: '+673', label: 'Brunei (+673)' },
  { code: '+359', label: 'Bulgaria (+359)' },
  { code: '+226', label: 'Burkina Faso (+226)' },
  { code: '+257', label: 'Burundi (+257)' },
  { code: '+855', label: 'Cambodia (+855)' },
  { code: '+237', label: 'Cameroon (+237)' },
  { code: '+1', label: 'Canada (+1)' },
  { code: '+238', label: 'Cape Verde (+238)' },
  { code: '+1345', label: 'Cayman Islands (+1345)' },
  { code: '+236', label: 'Central African Republic (+236)' },
  { code: '+235', label: 'Chad (+235)' },
  { code: '+56', label: 'Chile (+56)' },
  { code: '+86', label: 'China (+86)' },
  { code: '+57', label: 'Colombia (+57)' },
  { code: '+269', label: 'Comoros (+269)' },
  { code: '+242', label: 'Congo (+242)' },
  { code: '+243', label: 'Congo DR (+243)' },
  { code: '+682', label: 'Cook Islands (+682)' },
  { code: '+506', label: 'Costa Rica (+506)' },
  { code: '+225', label: "Cote d'Ivoire (+225)" },
  { code: '+385', label: 'Croatia (+385)' },
  { code: '+53', label: 'Cuba (+53)' },
  { code: '+357', label: 'Cyprus (+357)' },
  { code: '+420', label: 'Czechia (+420)' },
  { code: '+45', label: 'Denmark (+45)' },
  { code: '+253', label: 'Djibouti (+253)' },
  { code: '+1767', label: 'Dominica (+1767)' },
  { code: '+1809', label: 'Dominican Republic (+1809)' },
  { code: '+1829', label: 'Dominican Republic (+1829)' },
  { code: '+1849', label: 'Dominican Republic (+1849)' },
  { code: '+593', label: 'Ecuador (+593)' },
  { code: '+20', label: 'Egypt (+20)' },
  { code: '+503', label: 'El Salvador (+503)' },
  { code: '+240', label: 'Equatorial Guinea (+240)' },
  { code: '+291', label: 'Eritrea (+291)' },
  { code: '+372', label: 'Estonia (+372)' },
  { code: '+251', label: 'Ethiopia (+251)' },
  { code: '+500', label: 'Falkland Islands (+500)' },
  { code: '+298', label: 'Faroe Islands (+298)' },
  { code: '+679', label: 'Fiji (+679)' },
  { code: '+358', label: 'Finland (+358)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+594', label: 'French Guiana (+594)' },
  { code: '+689', label: 'French Polynesia (+689)' },
  { code: '+241', label: 'Gabon (+241)' },
  { code: '+220', label: 'Gambia (+220)' },
  { code: '+995', label: 'Georgia (+995)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+233', label: 'Ghana (+233)' },
  { code: '+350', label: 'Gibraltar (+350)' },
  { code: '+30', label: 'Greece (+30)' },
  { code: '+299', label: 'Greenland (+299)' },
  { code: '+1473', label: 'Grenada (+1473)' },
  { code: '+590', label: 'Guadeloupe (+590)' },
  { code: '+1671', label: 'Guam (+1671)' },
  { code: '+502', label: 'Guatemala (+502)' },
  { code: '+44', label: 'Guernsey (+44)' },
  { code: '+224', label: 'Guinea (+224)' },
  { code: '+245', label: 'Guinea-Bissau (+245)' },
  { code: '+592', label: 'Guyana (+592)' },
  { code: '+509', label: 'Haiti (+509)' },
  { code: '+504', label: 'Honduras (+504)' },
  { code: '+852', label: 'Hong Kong (+852)' },
  { code: '+36', label: 'Hungary (+36)' },
  { code: '+354', label: 'Iceland (+354)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+62', label: 'Indonesia (+62)' },
  { code: '+98', label: 'Iran (+98)' },
  { code: '+964', label: 'Iraq (+964)' },
  { code: '+353', label: 'Ireland (+353)' },
  { code: '+44', label: 'Isle of Man (+44)' },
  { code: '+972', label: 'Israel (+972)' },
  { code: '+39', label: 'Italy (+39)' },
  { code: '+1876', label: 'Jamaica (+1876)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+44', label: 'Jersey (+44)' },
  { code: '+962', label: 'Jordan (+962)' },
  { code: '+7', label: 'Kazakhstan (+7)' },
  { code: '+254', label: 'Kenya (+254)' },
  { code: '+686', label: 'Kiribati (+686)' },
  { code: '+383', label: 'Kosovo (+383)' },
  { code: '+965', label: 'Kuwait (+965)' },
  { code: '+996', label: 'Kyrgyzstan (+996)' },
  { code: '+856', label: 'Laos (+856)' },
  { code: '+371', label: 'Latvia (+371)' },
  { code: '+961', label: 'Lebanon (+961)' },
  { code: '+266', label: 'Lesotho (+266)' },
  { code: '+231', label: 'Liberia (+231)' },
  { code: '+218', label: 'Libya (+218)' },
  { code: '+423', label: 'Liechtenstein (+423)' },
  { code: '+370', label: 'Lithuania (+370)' },
  { code: '+352', label: 'Luxembourg (+352)' },
  { code: '+853', label: 'Macao (+853)' },
  { code: '+389', label: 'North Macedonia (+389)' },
  { code: '+261', label: 'Madagascar (+261)' },
  { code: '+265', label: 'Malawi (+265)' },
  { code: '+60', label: 'Malaysia (+60)' },
  { code: '+960', label: 'Maldives (+960)' },
  { code: '+223', label: 'Mali (+223)' },
  { code: '+356', label: 'Malta (+356)' },
  { code: '+692', label: 'Marshall Islands (+692)' },
  { code: '+596', label: 'Martinique (+596)' },
  { code: '+222', label: 'Mauritania (+222)' },
  { code: '+230', label: 'Mauritius (+230)' },
  { code: '+262', label: 'Mayotte (+262)' },
  { code: '+52', label: 'Mexico (+52)' },
  { code: '+691', label: 'Micronesia (+691)' },
  { code: '+373', label: 'Moldova (+373)' },
  { code: '+377', label: 'Monaco (+377)' },
  { code: '+976', label: 'Mongolia (+976)' },
  { code: '+382', label: 'Montenegro (+382)' },
  { code: '+1664', label: 'Montserrat (+1664)' },
  { code: '+212', label: 'Morocco (+212)' },
  { code: '+258', label: 'Mozambique (+258)' },
  { code: '+95', label: 'Myanmar (+95)' },
  { code: '+264', label: 'Namibia (+264)' },
  { code: '+674', label: 'Nauru (+674)' },
  { code: '+977', label: 'Nepal (+977)' },
  { code: '+31', label: 'Netherlands (+31)' },
  { code: '+687', label: 'New Caledonia (+687)' },
  { code: '+64', label: 'New Zealand (+64)' },
  { code: '+505', label: 'Nicaragua (+505)' },
  { code: '+227', label: 'Niger (+227)' },
  { code: '+234', label: 'Nigeria (+234)' },
  { code: '+683', label: 'Niue (+683)' },
  { code: '+850', label: 'North Korea (+850)' },
  { code: '+1670', label: 'Northern Mariana Islands (+1670)' },
  { code: '+47', label: 'Norway (+47)' },
  { code: '+968', label: 'Oman (+968)' },
  { code: '+92', label: 'Pakistan (+92)' },
  { code: '+680', label: 'Palau (+680)' },
  { code: '+970', label: 'Palestine (+970)' },
  { code: '+507', label: 'Panama (+507)' },
  { code: '+675', label: 'Papua New Guinea (+675)' },
  { code: '+595', label: 'Paraguay (+595)' },
  { code: '+51', label: 'Peru (+51)' },
  { code: '+63', label: 'Philippines (+63)' },
  { code: '+48', label: 'Poland (+48)' },
  { code: '+351', label: 'Portugal (+351)' },
  { code: '+1', label: 'Puerto Rico (+1)' },
  { code: '+974', label: 'Qatar (+974)' },
  { code: '+262', label: 'Reunion (+262)' },
  { code: '+40', label: 'Romania (+40)' },
  { code: '+7', label: 'Russia (+7)' },
  { code: '+250', label: 'Rwanda (+250)' },
  { code: '+590', label: 'Saint Barthelemy (+590)' },
  { code: '+290', label: 'Saint Helena (+290)' },
  { code: '+1869', label: 'Saint Kitts and Nevis (+1869)' },
  { code: '+1758', label: 'Saint Lucia (+1758)' },
  { code: '+590', label: 'Saint Martin (+590)' },
  { code: '+508', label: 'Saint Pierre and Miquelon (+508)' },
  { code: '+1784', label: 'Saint Vincent and the Grenadines (+1784)' },
  { code: '+685', label: 'Samoa (+685)' },
  { code: '+378', label: 'San Marino (+378)' },
  { code: '+239', label: 'Sao Tome and Principe (+239)' },
  { code: '+966', label: 'Saudi Arabia (+966)' },
  { code: '+221', label: 'Senegal (+221)' },
  { code: '+381', label: 'Serbia (+381)' },
  { code: '+248', label: 'Seychelles (+248)' },
  { code: '+232', label: 'Sierra Leone (+232)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+1721', label: 'Sint Maarten (+1721)' },
  { code: '+421', label: 'Slovakia (+421)' },
  { code: '+386', label: 'Slovenia (+386)' },
  { code: '+677', label: 'Solomon Islands (+677)' },
  { code: '+252', label: 'Somalia (+252)' },
  { code: '+27', label: 'South Africa (+27)' },
  { code: '+82', label: 'South Korea (+82)' },
  { code: '+211', label: 'South Sudan (+211)' },
  { code: '+34', label: 'Spain (+34)' },
  { code: '+94', label: 'Sri Lanka (+94)' },
  { code: '+249', label: 'Sudan (+249)' },
  { code: '+597', label: 'Suriname (+597)' },
  { code: '+268', label: 'Eswatini (+268)' },
  { code: '+46', label: 'Sweden (+46)' },
  { code: '+41', label: 'Switzerland (+41)' },
  { code: '+963', label: 'Syria (+963)' },
  { code: '+886', label: 'Taiwan (+886)' },
  { code: '+992', label: 'Tajikistan (+992)' },
  { code: '+255', label: 'Tanzania (+255)' },
  { code: '+66', label: 'Thailand (+66)' },
  { code: '+670', label: 'Timor-Leste (+670)' },
  { code: '+228', label: 'Togo (+228)' },
  { code: '+690', label: 'Tokelau (+690)' },
  { code: '+676', label: 'Tonga (+676)' },
  { code: '+1868', label: 'Trinidad and Tobago (+1868)' },
  { code: '+216', label: 'Tunisia (+216)' },
  { code: '+90', label: 'Turkey (+90)' },
  { code: '+993', label: 'Turkmenistan (+993)' },
  { code: '+1649', label: 'Turks and Caicos Islands (+1649)' },
  { code: '+688', label: 'Tuvalu (+688)' },
  { code: '+256', label: 'Uganda (+256)' },
  { code: '+380', label: 'Ukraine (+380)' },
  { code: '+971', label: 'United Arab Emirates (+971)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+1', label: 'United States (+1)' },
  { code: '+598', label: 'Uruguay (+598)' },
  { code: '+998', label: 'Uzbekistan (+998)' },
  { code: '+678', label: 'Vanuatu (+678)' },
  { code: '+379', label: 'Vatican City (+379)' },
  { code: '+58', label: 'Venezuela (+58)' },
  { code: '+84', label: 'Vietnam (+84)' },
  { code: '+1340', label: 'US Virgin Islands (+1340)' },
  { code: '+681', label: 'Wallis and Futuna (+681)' },
  { code: '+967', label: 'Yemen (+967)' },
  { code: '+260', label: 'Zambia (+260)' },
  { code: '+263', label: 'Zimbabwe (+263)' },
];

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data } = usePublicSiteConfig();
  const [step, setStep] = useState('portal');
  const [otpPhone, setOtpPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupCode, setSignupCode] = useState('+91');
  const [otpCode, setOtpCode] = useState('+91');
  const [loginCode, setLoginCode] = useState('+91');
  const user = useAuthStore(s => s.user);
  const setAuth = useAuthStore(s => s.setAuth);

  const initialMode = useMemo(() => MODES[location.pathname] || 'login', [location.pathname]);
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    setMode(initialMode);
    setError('');
    setMessage('');
  }, [initialMode]);

  if (user && !user.name) {
    return (
      <Layout branding={data.branding} landing={data.landing}>
        <ProfileSetup />
      </Layout>
    );
  }

  if (step === 'otp') {
    return (
      <Layout branding={data.branding} landing={data.landing}>
        <OTPVerify phone={otpPhone} onBack={() => setStep('portal')} />
      </Layout>
    );
  }

  async function handlePasswordLogin(formData) {
    const { data } = await api.post('/auth/login', formData);
    await ensureEncryptionKeys(data.accessToken);
    setAuth(data.user, data.accessToken);
    navigate('/chats', { replace: true });
  }

  async function handleSignup(formData) {
    const { data } = await api.post('/auth/signup', formData);
    await ensureEncryptionKeys(data.accessToken);
    setAuth(data.user, data.accessToken);
    navigate('/chats', { replace: true });
  }

  async function handleForgotPassword(identifier) {
    await api.post('/auth/forgot-password', { identifier });
    setMessage('OTP sent. Enter it below with your new password.');
    setMode('reset');
  }

  async function handleResetPassword(formData) {
    await api.post('/auth/reset-password', formData);
    setMessage('Password reset successful. You can log in now.');
    setMode('login');
    navigate('/login', { replace: true });
  }

  async function handleOtpStart(phone) {
    await api.post('/auth/send-otp', { phone });
    setOtpPhone(phone);
    setStep('otp');
  }

  async function onSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());

    if (mode === 'signup') {
      payload.phone = composePhone(signupCode, payload.phone);
    }
    if (mode === 'login') {
      payload.identifier = normalizeIdentifier(payload.identifier, loginCode);
    }
    if (mode === 'forgot' || mode === 'reset') {
      payload.identifier = normalizeIdentifier(payload.identifier, loginCode);
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'login') await handlePasswordLogin(payload);
      if (mode === 'signup') await handleSignup(payload);
      if (mode === 'forgot') await handleForgotPassword(payload.identifier);
      if (mode === 'reset') await handleResetPassword(payload);
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout branding={data.branding} landing={data.landing}>
      <div className="space-y-5">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-600">{data.branding.appName}</p>
          <h2 className="text-2xl font-semibold text-slate-900">{modeTitle(mode)}</h2>
          <p className="text-sm text-slate-500">{modeSubtitle(mode)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {['login', 'signup', 'forgot'].map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => navigate(tab === 'login' ? '/login' : tab === 'signup' ? '/signup' : '/forgot-password')}
              className={`px-3 py-2 rounded-full text-sm transition ${mode === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {modeTitle(tab)}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <Field name="name" placeholder="Full name" required />
              <Field name="email" type="email" placeholder="Email address" />
              <PhoneField
                name="phone"
                placeholder="Phone number"
                code={signupCode}
                onCodeChange={setSignupCode}
                required
              />
              <Field name="password" type="password" placeholder="Create password" required />
            </>
          )}

          {mode === 'login' && (
            <>
              <PhoneOrEmailField
                name="identifier"
                placeholder="Email or phone number"
                code={loginCode}
                onCodeChange={setLoginCode}
                required
              />
              <Field name="password" type="password" placeholder="Password" required />
            </>
          )}

          {mode === 'forgot' && (
            <PhoneOrEmailField
              name="identifier"
              placeholder="Email or phone number"
              code={loginCode}
              onCodeChange={setLoginCode}
              required
            />
          )}

          {mode === 'reset' && (
            <>
              <PhoneOrEmailField
                name="identifier"
                placeholder="Email or phone number"
                code={loginCode}
                onCodeChange={setLoginCode}
                required
              />
              <Field name="otp" placeholder="6-digit OTP" required />
              <Field name="newPassword" type="password" placeholder="New password" required />
            </>
          )}

          {message && <p className="text-emerald-700 text-sm rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">{message}</p>}
          {error && <p className="text-rose-600 text-sm rounded-xl bg-rose-50 border border-rose-200 px-3 py-2">{error}</p>}

          <button disabled={loading} className="w-full rounded-2xl bg-emerald-600 text-white py-3 font-medium shadow-lg shadow-emerald-600/15 hover:bg-emerald-500 disabled:opacity-60">
            {loading ? 'Please wait...' : submitLabel(mode)}
          </button>
        </form>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
          <div className="relative text-center text-xs uppercase tracking-[0.2em] text-slate-400 bg-white mx-auto w-fit px-3">or</div>
        </div>

        <OtpStarter onStart={handleOtpStart} code={otpCode} onCodeChange={setOtpCode} />

        <div className="text-sm text-slate-500 flex flex-wrap gap-x-4 gap-y-2">
          <Link to="/" className="hover:text-slate-900">Back to website</Link>
        </div>
      </div>
    </Layout>
  );
}

function Layout({ branding, landing, children }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(5,150,105,0.18),_transparent_28%),linear-gradient(135deg,#f8fafc,#eff6ff_55%,#f8fafc)] p-6 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-6xl grid lg:grid-cols-[1.1fr_0.9fr] bg-white/85 backdrop-blur-xl border border-white rounded-[2rem] shadow-2xl overflow-hidden">
        <div className="hidden lg:flex flex-col justify-between p-10 bg-slate-950 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.35),_transparent_32%)]" />
          <div className="relative">
            <div className="flex items-center gap-4">
              <img src={branding.logoUrl || '/icon.svg'} alt={branding.appName} className="w-14 h-14 rounded-2xl object-cover bg-white/10 p-2" />
              <div>
                <p className="text-xl font-semibold">{branding.appName}</p>
                <p className="text-sm text-slate-300">{branding.tagline}</p>
              </div>
            </div>
            <h1 className="mt-10 text-4xl font-semibold leading-tight">{landing.heroTitle}</h1>
            <p className="mt-4 text-slate-300 leading-7">{landing.heroSubtitle}</p>
          </div>
          <div className="relative space-y-3">
            {(landing.featureCards || []).slice(0, 3).map((card, index) => (
              <div key={`${card.title}-${index}`} className="rounded-2xl bg-white/8 border border-white/10 p-4">
                <p className="font-medium">{card.title}</p>
                <p className="text-sm text-slate-300 mt-1">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="p-6 md:p-10 flex items-center justify-center">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Field({ name, ...props }) {
  return <input name={name} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition" {...props} />;
}

function PhoneField({ name, code, onCodeChange, ...props }) {
  return (
    <div className="flex gap-2">
      <CountryCodeSelect value={code} onChange={onCodeChange} />
      <input name={name} className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition" {...props} />
    </div>
  );
}

function PhoneOrEmailField({ name, code, onCodeChange, ...props }) {
  return (
    <div className="flex gap-2">
      <CountryCodeSelect value={code} onChange={onCodeChange} />
      <input name={name} className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition" {...props} />
    </div>
  );
}

function CountryCodeSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);

  const selected = COUNTRY_CODES.find((entry) => entry.code === value) || COUNTRY_CODES[0];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRY_CODES;
    return COUNTRY_CODES.filter((entry) => (
      entry.label.toLowerCase().includes(q) || entry.code.includes(q)
    ));
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-52">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full rounded-2xl border border-slate-300 bg-white text-black px-3 py-3 text-left outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
      >
        {selected.label}
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl border border-slate-300 bg-white shadow-xl">
          <div className="p-2 border-b border-slate-200">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country or code"
              className="w-full rounded-xl border border-slate-300 bg-white text-black px-3 py-2 outline-none focus:border-emerald-500"
            />
          </div>
          <div className="max-h-64 overflow-auto py-1">
            {filtered.map((entry) => (
              <button
                key={`${entry.code}-${entry.label}`}
                type="button"
                onClick={() => {
                  onChange(entry.code);
                  setOpen(false);
                  setQuery('');
                }}
                className={`w-full px-3 py-2 text-left text-sm transition ${entry.code === value ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                {entry.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-slate-500">No match found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OtpStarter({ onStart, code, onCodeChange }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    setLoading(true);
    setError('');
    try {
      await onStart(composePhone(code, phone));
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to send OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div>
        <p className="font-medium text-slate-900">Quick login with phone OTP</p>
        <p className="text-sm text-slate-500">Use your phone number if you prefer passwordless access.</p>
      </div>
      <div className="flex gap-2">
        <CountryCodeSelect value={code} onChange={onCodeChange} />
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500" />
        <button type="button" onClick={start} disabled={loading || !phone} className="rounded-2xl bg-slate-900 text-white px-4 py-3 whitespace-nowrap disabled:opacity-60">
          {loading ? 'Sending...' : 'Send OTP'}
        </button>
      </div>
      {error && <p className="text-rose-600 text-sm">{error}</p>}
    </div>
  );
}

function modeTitle(mode) {
  if (mode === 'signup') return 'Sign Up';
  if (mode === 'forgot') return 'Forgot Password';
  if (mode === 'reset') return 'Reset Password';
  return 'Login';
}

function modeSubtitle(mode) {
  if (mode === 'signup') return 'Create your account and get started immediately.';
  if (mode === 'forgot') return 'Request an OTP to reset your password securely.';
  if (mode === 'reset') return 'Enter the OTP and choose a new password.';
  return 'Sign in with your password or continue with OTP.';
}

function submitLabel(mode) {
  if (mode === 'signup') return 'Create Account';
  if (mode === 'forgot') return 'Send Reset OTP';
  if (mode === 'reset') return 'Reset Password';
  return 'Login';
}

function composePhone(countryCode, rawNumber) {
  const raw = (rawNumber || '').trim();
  if (raw.startsWith('+')) {
    return `+${raw.replace(/[^\d]/g, '')}`;
  }
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return '';
  const normalizedCode = (countryCode || '+91').replace(/\s+/g, '');
  return `${normalizedCode}${digits}`;
}

function normalizeIdentifier(identifier, countryCode) {
  const value = (identifier || '').trim();
  if (!value) return '';
  if (value.includes('@') || value.startsWith('+')) return value;
  if (/^\d[\d\s()-]*$/.test(value)) {
    return composePhone(countryCode, value);
  }
  return value;
}
