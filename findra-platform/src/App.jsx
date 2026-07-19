import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Buildings,
  CalendarDots,
  CaretDown,
  Check,
  CheckCircle,
  ChatCircleText,
  Clock,
  CreditCard,
  DotsThree,
  EnvelopeSimple,
  Eye,
  FacebookLogo,
  FileText,
  Funnel,
  Gear,
  Globe,
  Heart,
  House,
  InstagramLogo,
  LinkedinLogo,
  List,
  MagnifyingGlass,
  MapPin,
  PencilSimple,
  Phone,
  Plug,
  Plus,
  ShareNetwork,
  ShieldCheck,
  SignOut,
  SquaresFour,
  Storefront,
  Trash,
  TrendUp,
  UploadSimple,
  UserCircle,
  UsersThree,
  WarningCircle,
  X,
  XCircle,
  Moon,
  Sun,
  ChartLineUp,
  TextB as TextBolder,
  TextItalic,
  TextUnderline,
  ListBullets,
  ListNumbers,
  LinkSimple,
  ArrowsOutSimple,
  ArrowsClockwise,
  ImageSquare,
} from "@phosphor-icons/react";
import {
  readCustomFields,
  readManagedTaxonomy,
  recordNotificationEvent,
  SubscriptionsManagement,
  UsersManagement,
} from "./adminModules";

// Retained only while the legacy fallback code below is removed in the next
// migration. It is never exposed or accepted by the production auth flow.
const demoAccounts = {};

function BrandLogo({ className = "" }) {
  return (
    <span className={`brand-logo ${className}`}>
      <img
        className="logo-for-light"
        src="/assets/findra-logo-light-transparent.png"
        alt="Findra"
      />
      <img
        className="logo-for-dark"
        src="/assets/findra-logo-dark-transparent.png"
        alt="Findra"
      />
    </span>
  );
}

async function authRequest(path, body) {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload.error || "We could not process your request.");
  return payload;
}

function sessionFromUser(user) {
  return user
    ? {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        username: user.email,
        emailVerified: user.emailVerified,
        profileImage: user.profileImage || "",
      }
    : null;
}

function accountInitials(session) {
  const source = (session?.name || session?.email || "F").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

function AccountAvatar({ session, businessLogo = "", className = "" }) {
  const src = session?.profileImage || businessLogo || "";
  if (src) return <img className={`account-avatar ${className}`} src={src} alt="" />;
  return (
    <span className={`account-avatar account-avatar-fallback ${className}`}>
      {accountInitials(session)}
    </span>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("findra-theme") || "light",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("findra-theme", theme);
  }, [theme]);
  useEffect(() => {
    const syncTheme = (event) =>
      setTheme(event.detail || localStorage.getItem("findra-theme") || "light");
    window.addEventListener("findra-theme-change", syncTheme);
    window.addEventListener("storage", syncTheme);
    return () => {
      window.removeEventListener("findra-theme-change", syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);
  const next = theme === "light" ? "dark" : "light";
  const toggle = () => {
    setTheme(next);
    window.dispatchEvent(
      new CustomEvent("findra-theme-change", { detail: next }),
    );
  };
  return (
    <button
      className="theme-toggle"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={toggle}
    >
      {theme === "light" ? <Moon /> : <Sun />}
    </button>
  );
}

const categories = [
  {
    name: "Products & Suppliers",
    image: "/assets/products-suppliers.jpg",
    description:
      "Find manufacturers, wholesalers, and suppliers of goods across all industries, from raw materials to finished products.",
  },
  {
    name: "Services & Rentals",
    image: "/assets/services-rentals.jpg",
    description:
      "Discover professional services and rental solutions for businesses and events, including equipment, venues, and specialized support.",
  },
  {
    name: "Professionals",
    image: "/assets/professionals.jpg",
    description:
      "Connect with qualified professionals offering expertise in business, technical, and specialized fields for hire or consultation.",
  },
  {
    name: "Freelancers & Creatives",
    image: "/assets/freelancers-creatives.jpg",
    description:
      "Hire skilled freelancers and creative talent for projects in design, writing, marketing, tech, and more.",
  },
  {
    name: "Community & Institutions",
    image: "/assets/community-institutions.jpg",
    description:
      "Locate schools, training centers, associations, and organizations supporting Filipino businesses.",
  },
];

const blankListing = {
  name: "",
  cardTitle: "",
  type: "Business / Company",
  category: categories[0].name,
  location: "",
  status: "Draft",
  owner: "",
  image: "/assets/products-suppliers.jpg",
  tagline: "",
  services: [],
  description: "",
  views: 0,
  email: "",
  phone: "",
  website: "",
  facebook: "",
  instagram: "",
  linkedin: "",
  whatsapp: "",
  viber: "",
  additionalCategory: "",
  categories: [],
  additionalCategories: [],
  additionalServices: [],
  video: "",
  logo: "",
  galleryImages: [],
  attachments: [],
  customValues: {},
};

function formatDate() {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  const go = (next) => {
    window.history.pushState({}, "", next);
    setPath(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return [path, go];
}

function usePersistedDashboardSection(storageKey, fallback) {
  const [section, setSection] = useState(() => {
    try {
      return localStorage.getItem(storageKey) || fallback;
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, section);
    } catch {
      // The active dashboard section is a convenience enhancement only.
    }
  }, [section, storageKey]);
  return [section, setSection];
}

function Link({ to, go, className = "", children, onClick }) {
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
        go(to);
      }}
    >
      {children}
    </a>
  );
}

function GreenButton({
  children,
  icon = <ArrowRight weight="bold" />,
  onClick,
  type = "button",
  className = "",
}) {
  return (
    <button
      type={type}
      className={`green-button ${className}`}
      onClick={onClick}
    >
      <span>{children}</span>
      {icon}
    </button>
  );
}

function StatusModal({ notice, onClose }) {
  if (!notice) return null;
  const success = notice.type === "success";
  return (
    <div
      className="status-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className={`status-modal ${success ? "status-success" : "status-error"}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="status-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="status-modal-close"
          type="button"
          aria-label="Close notification"
          onClick={onClose}
        >
          <X />
        </button>
        <div className="status-modal-icon">
          {success ? <CheckCircle weight="fill" /> : <XCircle weight="fill" />}
        </div>
        <span>{success ? "Update successful" : "Update failed"}</span>
        <h2 id="status-modal-title">{notice.title}</h2>
        <p>{notice.message}</p>
        <button
          className={success ? "admin-primary" : "status-error-button"}
          type="button"
          onClick={onClose}
        >
          {success ? "Continue" : "Try again"}
        </button>
      </section>
    </div>
  );
}

let googleMapsLoader;

function loadGoogleMaps(key) {
  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (!key) return Promise.resolve(null);
  if (!googleMapsLoader) {
    googleMapsLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&v=weekly`;
      script.async = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error("Google Maps could not be loaded."));
      document.head.appendChild(script);
    });
  }
  return googleMapsLoader;
}

function GoogleAddressInput({ value, onChange, onSelect, required = true, showStatus = true, placeholder = "Start typing an address in the Philippines" }) {
  const inputRef = useRef(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    let listener;
    let active = true;
    fetch("/api/maps/embed-key", { credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => loadGoogleMaps(payload?.key || ""))
      .then((google) => {
        if (!active) return;
        if (!google?.maps?.places || !inputRef.current) {
          setState("unavailable");
          return;
        }
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: "ph" },
          fields: ["formatted_address", "geometry", "place_id", "name"],
          // Geocode predictions include streets, buildings, barangays, cities,
          // and provinces, so users can refine a broad search into an exact
          // business location with the keyboard.
          types: ["geocode"],
        });
        listener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const latitude = place.geometry?.location?.lat?.();
          const longitude = place.geometry?.location?.lng?.();
          onSelect({
            address: place.formatted_address || inputRef.current?.value || "",
            placeId: place.place_id || "",
            latitude: Number.isFinite(latitude) ? latitude : "",
            longitude: Number.isFinite(longitude) ? longitude : "",
          });
        });
        setState("ready");
      })
      .catch(() => active && setState("unavailable"));
    return () => {
      active = false;
      listener?.remove();
    };
  // The Maps widget is attached once to this input. The form setter remains
  // stable across renders, so recreating the paid autocomplete session is not
  // necessary while the user is filling out a listing.
  }, []);

  return <>
    <input
      ref={inputRef}
      required={required}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      autoComplete="street-address"
    />
    {showStatus && <small className={`address-autocomplete-status ${state}`}>
      {state === "ready" ? "Type to search, then use ↓ and Enter or click a suggestion to pin the exact location." : "Enter the full address manually while Google address suggestions are unavailable."}
    </small>}
  </>;
}

function BusinessMapFrame({ location, latitude, longitude }) {
  const [embedKey, setEmbedKey] = useState("");
  useEffect(() => {
    fetch("/api/maps/embed-key", { credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => setEmbedKey(payload?.key || ""))
      .catch(() => {});
  }, []);
  const placeQuery = latitude !== "" && latitude !== undefined && longitude !== "" && longitude !== undefined
    ? `${latitude},${longitude}`
    : location || "Metro Manila, Philippines";
  const query = encodeURIComponent(placeQuery);
  const source = embedKey
    ? `https://www.google.com/maps/embed/v1/place?key=${embedKey}&q=${query}`
    : "https://www.openstreetmap.org/export/embed.html?bbox=120.93%2C14.50%2C121.10%2C14.65&layer=mapnik";
  return <div className="map-frame">
    <iframe title="Business location map" src={source} />
    <span><MapPin weight="fill" /> {location || "Metro Manila, Philippines"}</span>
  </div>;
}

function Header({ go }) {
  const [menu, setMenu] = useState(false);
  const [accountMenu, setAccountMenu] = useState(false);
  const [session, setSession] = useState(null);
  const [businessLogo, setBusinessLogo] = useState("");
  const accountMenuRef = useRef(null);
  useEffect(() => {
    const closeOnOutsidePress = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) setAccountMenu(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, []);
  useEffect(() => {
    if (!session || session.role === "admin") {
      setBusinessLogo("");
      return;
    }
    let active = true;
    fetch("/api/listings?mine=true", { credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : {})
      .then((payload) => {
        if (active) setBusinessLogo(payload.listings?.[0]?.logo || "");
      })
      .catch(() => active && setBusinessLogo(""));
    return () => { active = false; };
  }, [session?.id, session?.role]);
  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = await response.json();
        return sessionFromUser(payload.user);
      })
      .then((currentSession) => {
        if (active) setSession(currentSession);
      })
      .catch(() => {
        if (active) setSession(null);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const syncSession = (event) => setSession(event.detail || null);
    window.addEventListener("findra-session-change", syncSession);
    return () => window.removeEventListener("findra-session-change", syncSession);
  }, []);
  const dashboardPath = session?.role === "admin" ? "/admin" : "/user";
  const openDashboardSection = (section) => {
    if (session?.role === "user") localStorage.setItem("findra-user-section", section);
    setAccountMenu(false);
    go(dashboardPath);
  };
  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    setSession(null);
    setAccountMenu(false);
    go("/");
  };
  return (
    <>
      <div className="top-strip">FIND THE RIGHT PARTNER, FAST.</div>
      <header className="site-header">
        <button
          className="mobile-menu"
          aria-label="Open menu"
          onClick={() => setMenu(true)}
        >
          <List size={25} />
        </button>
        <Link to="/" go={go} className="wordmark">
          <BrandLogo />
        </Link>
        <nav className="main-nav">
          <Link to="/" go={go}>
            Home
          </Link>
          <Link to="/listings" go={go}>
            Businesses <CaretDown size={12} />
          </Link>
          <Link to="/about" go={go}>
            About
          </Link>
          <Link to="/packages" go={go}>
            Packages
          </Link>
          <Link to="/contact" go={go}>
            Contact Us
          </Link>
        </nav>
        <div className="account-nav">
          <ThemeToggle />
          {session ? (
            <div className="header-account-menu" ref={accountMenuRef}>
                <button type="button" className="header-dashboard-link" aria-label="Open account menu" aria-expanded={accountMenu} onClick={() => setAccountMenu((value) => !value)}>
                  <AccountAvatar session={session} businessLogo={businessLogo} />
                  <CaretDown size={13} />
                </button>
                {accountMenu && <div className="header-account-dropdown">
                  <div className="account-dropdown-profile"><AccountAvatar session={session} businessLogo={businessLogo} /><div><strong>{session.name}</strong><small>{session.email}</small></div></div>
                  <button type="button" onClick={() => openDashboardSection("Overview")}><SquaresFour /> Dashboard</button>
                  {session.role !== "admin" && <button type="button" onClick={() => openDashboardSection("Profile")}><UserCircle /> Account & profile</button>}
                  {session.role !== "admin" && <button type="button" onClick={() => openDashboardSection("Inbox")}><Bell /> Inbox</button>}
                  {session.role !== "admin" && <button type="button" onClick={() => openDashboardSection("Plan & Billing")}><CreditCard /> Plan & billing</button>}
                  <Link to="/add-listing" go={go} onClick={() => setAccountMenu(false)}><Plus /> Add business</Link>
                  <button type="button" className="header-account-signout" onClick={signOut}><SignOut /> Sign out</button>
                </div>}
              </div>
          ) : (
            <>
              <Link to="/login" go={go}>
                Log In
              </Link>
              <span className="divider" />
              <Link to="/login" go={go}>
                Register
              </Link>
            </>
          )}
          {!session && <Link to="/packages" go={go} className="discover-link">Add Business <Plus weight="bold" /></Link>}
        </div>
        <div className="mobile-header-actions">
          <ThemeToggle />
          <button
            className="mobile-account"
            aria-label={session ? "Open dashboard" : "Account"}
            onClick={() => go(session ? dashboardPath : "/login")}
          >
            <UserCircle size={46} weight="thin" />
          </button>
        </div>
      </header>
      {menu && (
        <div className="menu-overlay" onClick={() => setMenu(false)}>
          <aside className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <Link
                to="/packages"
                go={go}
                className="discover-link"
                onClick={() => setMenu(false)}
              >
                Add Business <Plus weight="bold" />
              </Link>
              <button onClick={() => setMenu(false)}>
                <X size={30} />
              </button>
            </div>
            <Link to="/" go={go} onClick={() => setMenu(false)}>
              Home
            </Link>
            <Link to="/listings" go={go} onClick={() => setMenu(false)}>
              Businesses <CaretDown size={14} />
            </Link>
            <Link to="/about" go={go} onClick={() => setMenu(false)}>
              About
            </Link>
            <Link to="/packages" go={go} onClick={() => setMenu(false)}>
              Packages
            </Link>
            <Link to="/contact" go={go} onClick={() => setMenu(false)}>
              Contact Us
            </Link>
            {session ? (
              <Link to={dashboardPath} go={go} onClick={() => setMenu(false)}>
                My Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" go={go} onClick={() => setMenu(false)}>
                  Log In
                </Link>
                <Link to="/login" go={go} onClick={() => setMenu(false)}>
                  Register
                </Link>
              </>
            )}
            <div className="drawer-contact">
              <strong>Call Support</strong>
              <a href="tel:09175142402">0917 514 2402</a>
              <strong>Email Address</strong>
              <a href="mailto:hello@findra.ph">hello@findra.ph</a>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function Footer({ go }) {
  return (
    <footer id="contact">
      <div className="footer-main">
        <BrandLogo className="footer-brand" />
        <div>
          <h4>Follow #Findra</h4>
          <div className="socials">
            <FacebookLogo weight="fill" />
            <a
              href="https://www.instagram.com/findra.ph/"
              target="_blank"
              rel="noreferrer"
              aria-label="Follow Findra on Instagram"
            >
              <InstagramLogo weight="bold" />
            </a>
          </div>
        </div>
        <div>
          <h4>Contact</h4>
          <a href="mailto:hello@findra.ph">
            <EnvelopeSimple /> hello@findra.ph
          </a>
        </div>
      </div>
      <div className="footer-links">
        <Link to="/about" go={go}>
          About
        </Link>
        <span />
        <Link to="/legal" go={go}>
          Legal & Policies
        </Link>
        <span />
        <Link to="/packages" go={go}>
          Packages
        </Link>
        <span />
        <Link to="/faq" go={go}>
          FAQ
        </Link>
      </div>
      <div className="copyright">
        © 2026 Findra. All rights reserved.{" "}
        <button onClick={() => go("/login")}>Account Login</button>
      </div>
    </footer>
  );
}

function PublicLayout({ go, children }) {
  return (
    <div className="public-app">
      <Header go={go} />
      {children}
      <Footer go={go} />
    </div>
  );
}

function HomePage({ go, listings }) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const search = () => go(`/listings${keyword || category ? "?search=1" : ""}`);
  return (
    <PublicLayout go={go}>
      <section className="hero">
        <div className="hero-inner">
          <h1>
            <span className="hero-title-desktop">
              Your go-to place to <br />
              find the business for <br />
              your needs.
            </span>
            <span className="hero-title-mobile">
              Your go-to place to
              <br />
              find the business
              <br />
              for your needs.
            </span>
          </h1>
          <p>
            <span className="hero-title-desktop">
              A space where businesses get discovered and <br />
              people connect with the right ones.
            </span>
            <span className="hero-title-mobile">
              A space where businesses get discovered
              <br />
              and
              <br />
              people connect with the right ones.
            </span>
          </p>
          <div className="hero-search">
            <label>
              <MapPin />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Keyword"
              />
            </label>
            <label>
              <SquaresFour />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Business Category</option>
                {categories.map((c) => (
                  <option key={c.name}>{c.name}</option>
                ))}
              </select>
            </label>
            <GreenButton icon={<MagnifyingGlass />} onClick={search}>
              Search
            </GreenButton>
          </div>
        </div>
      </section>
      <section className="section category-section">
        <div className="eyebrow">CATEGORIES</div>
        <h2>Built to Match Your Business Needs</h2>
        <p className="section-intro">
          Find the right partners across curated categories
        </p>
        <div className="category-grid">
          {categories.map((c) => (
            <article className="category-card" key={c.name}>
              <img src={c.image} alt="" />
              <h3>{c.name}</h3>
              <p>{c.description}</p>
              <GreenButton onClick={() => go("/listings")}>
                See More
              </GreenButton>
            </article>
          ))}
        </div>
      </section>
      <section className="section featured-section">
        <div>
          <div className="eyebrow">BUSINESSES</div>
          <h2>Featured Businesses</h2>
        </div>
        <button className="text-link" onClick={() => go("/listings")}>
          View all <ArrowRight />
        </button>
        <div className="featured-grid">
          {listings
            .filter((l) => l.status === "Published")
            .map((item) => (
              <ListingCard key={item.id} item={item} go={go} />
            ))}
        </div>
      </section>
      <section className="section">
        <div className="discover-cta">
          <h2>Be Discovered</h2>
          <p>
            When visibility means growth, we make sure your business gets
            noticed by the people who matter.
          </p>
          <GreenButton onClick={() => go("/packages")}>
            Showcase Your Business
          </GreenButton>
        </div>
      </section>
    </PublicLayout>
  );
}

function ListingCard({ item, go }) {
  const cardTitle = item.cardTitle?.trim() || item.name;
  return (
    <article className="listing-card" onClick={() => go(`/listing/${item.id}`)}>
      <div className="listing-image">
        <img src={item.image} alt="" />
        <span>{item.tagline}</span>
      </div>
      <div className="listing-content">
        <div className="listing-card-category">{item.category}</div>
        <div className="chips">
          {item.services.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <h3>{cardTitle}</h3>
        <p className="location">
          <MapPin weight="fill" />
          {item.location}, Philippines
        </p>
        <p className="listing-card-summary">{item.description || `${item.tagline}. Discover services, connect directly, and make your next project easier.`}</p>
        <div className="card-actions">
          <button className="save-listing-action" aria-label={`Save ${cardTitle}`} title="Save business" onClick={(event) => event.stopPropagation()}>
            <Heart />
          </button>
          <button aria-label={`Share ${cardTitle}`} onClick={(event) => { event.stopPropagation(); navigator.share?.({ title: cardTitle, text: item.tagline, url: `${window.location.origin}/listing/${item.id}` }); }}>
            <ShareNetwork />
          </button>
        </div>
        <button className="listing-card-detail" onClick={(event) => { event.stopPropagation(); go(`/listing/${item.id}`); }}>View business <ArrowRight /></button>
      </div>
    </article>
  );
}

function ListingsPage({ go, listings }) {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [cat, setCat] = useState("All");
  const [type, setType] = useState("All");
  const filtered = listings.filter(
    (l) =>
      l.status === "Published" &&
      (cat === "All" || l.category === cat) &&
      (type === "All" || l.type === type) &&
      `${l.name} ${l.cardTitle || ""} ${l.category} ${l.type} ${l.services?.join(" ")} ${l.description || ""} ${l.location}`.toLowerCase().includes(search.toLowerCase()) &&
      (!location || String(l.location || "").toLowerCase().split(/[ ,]+/).some((term) => term.length > 3 && location.toLowerCase().includes(term))),
  );
  return (
    <PublicLayout go={go}>
      <div className="breadcrumb">
        <Link to="/" go={go}>
          Home
        </Link>
        <ArrowRight /> Search Results
      </div>
      <section className="directory-search-shell">
        <div className="directory-search-heading"><div><span className="eyebrow">DISCOVER LOCAL BUSINESSES</span><h1>Find the right partner for your next project.</h1></div><span>{filtered.length} matching {filtered.length === 1 ? "business" : "businesses"}</span></div>
      <div className="listings-search">
        <label>
          <MagnifyingGlass />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Keyword"
          />
        </label>
        <label className="directory-location-input">
          <MapPin weight="fill" />
          <GoogleAddressInput value={location} onChange={(value) => { setLocation(value); setSelectedPlace(null); }} onSelect={(place) => { setLocation(place.address); setSelectedPlace(place); }} required={false} showStatus={false} placeholder="Search by city, address, or area" />
        </label>
      </div>
      {location && <div className="directory-search-active"><MapPin weight="fill" /> Searching near <strong>{location}</strong><button onClick={() => { setLocation(""); setSelectedPlace(null); }}>Clear</button></div>}
      </section>
      <main className="listings-layout">
        <aside className="filters">
          <h3>Business Type</h3>
          {["All", "Business / Company", "Freelancer / Creative"].map((x) => (
            <label key={x}>
              <input
                type="radio"
                checked={type === x}
                onChange={() => setType(x)}
              />
              {x}
            </label>
          ))}
          <h3>Business Category</h3>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option>All</option>
            {categories.map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>
          <h3>Business Services</h3>
          <input className="filter-search" placeholder="Search" />
          {[
            "Any",
            "Full Coordination",
            "Graphic Design",
            "Software Development",
            "Web & App Development",
          ].map((x, i) => (
            <label key={x}>
              <input type="radio" defaultChecked={i === 0} />
              {x}
            </label>
          ))}
        </aside>
        <section className="results">
          <div className="mobile-filter-row">
            <button>
              <Funnel /> Filters
            </button>
            <span>{filtered.length} results</span>
          </div>
          {filtered.map((item) => (
            <ListingCard key={item.id} item={item} go={go} />
          ))}
          {!filtered.length && (
            <div className="empty">
              <MagnifyingGlass size={42} />
              <h3>No businesses found</h3>
              <p>Try a broader keyword or category.</p>
            </div>
          )}
          <p className="results-count">
            Showing 1 to {filtered.length} of {filtered.length} results
          </p>
        </section>
      </main>
    </PublicLayout>
  );
}

function ListingDetail({ go, item }) {
  const [sent, setSent] = useState(false);
  const publicCustomFields = useMemo(
    () => readCustomFields().filter((field) => field.visibility?.publicProfile !== false),
    [],
  );
  if (!item)
    return (
      <PublicLayout go={go}>
        <main className="detail-page empty">
          <Storefront size={52} />
          <h1>Listing not found</h1>
          <p>This business may have been removed.</p>
          <GreenButton onClick={() => go("/listings")}>
            Browse businesses
          </GreenButton>
        </main>
      </PublicLayout>
    );
  const gallery = item.galleryImages?.length ? item.galleryImages : [];
  const about =
    item.description ||
    "We are a Filipino business built around thoughtful service, reliable delivery, and connections that create lasting value. Our team brings every project to life with care, clarity, and a practical understanding of what clients need.";
  const initials = item.name
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2);
  const detailVideoEmbed = getYouTubeEmbedUrl(item.video);
  return (
    <PublicLayout go={go}>
      <main className="detail-page">
        <div className="detail-hero">
          <img src={item.image} alt={`${item.name} featured`} />
          <div className="detail-overlay">
            <span>{item.category}</span>
            <h1>{item.name}</h1>
            <p>{item.tagline}</p>
          </div>
        </div>
        <div className="detail-meta">
          <div>
            <strong>Business Type:</strong>
            <span>{item.type}</span>
            <strong>Business Category:</strong>
            <span>{(item.categories || [item.category]).join(", ")}</span>
            <strong>Business Address:</strong>
            <span>{item.location || "Not provided"}</span>
          </div>
          <div className={`detail-logo ${item.logo ? "has-image" : ""}`}>
            {item.logo ? (
              <img src={item.logo} alt={`${item.name} logo`} />
            ) : (
              initials
            )}
          </div>
        </div>
        <div className="detail-columns">
          <article>
            <h1>{item.name}</h1>
            <h2>{item.tagline}</h2>
            <div className="detail-sections">
              <section className="panel detail-section detail-social-card">
                <h3 className="detail-section-title">Social &amp; online presence</h3>
                <div className="detail-social">
                  {item.website ? (
                    <a href={item.website} target="_blank" rel="noreferrer" aria-label={`${item.name} website`}>
                      <Globe /> <span>Website</span>
                    </a>
                  ) : (
                    <span className="detail-social-empty">
                      <Globe /> <span>Website</span>
                    </span>
                  )}
                  {item.facebook && (
                    <a href={item.facebook} target="_blank" rel="noreferrer" aria-label={`${item.name} Facebook`}>
                      <FacebookLogo weight="fill" /> <span>Facebook</span>
                    </a>
                  )}
                  {item.instagram && (
                    <a href={item.instagram} target="_blank" rel="noreferrer" aria-label={`${item.name} Instagram`}>
                      <InstagramLogo weight="bold" /> <span>Instagram</span>
                    </a>
                  )}
                  {item.linkedin && (
                    <a href={item.linkedin} target="_blank" rel="noreferrer" aria-label={`${item.name} LinkedIn`}>
                      <LinkedinLogo weight="fill" /> <span>LinkedIn</span>
                    </a>
                  )}
                </div>
              </section>
              <section className="panel detail-section">
                <h3 className="detail-section-title">About us</h3>
                <p>{about}</p>
              </section>
              <section className="panel detail-section">
                <h3 className="detail-section-title">Our services</h3>
                <div className="service-tags detail-service-tags">
                  {item.services.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
              </section>
              {item.location && (
                <section className="panel detail-section listing-location-map">
                  <div className="listing-location-map-heading">
                    <h3 className="detail-section-title">Business location</h3>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.latitude !== "" && item.latitude !== undefined && item.longitude !== "" && item.longitude !== undefined ? `${item.latitude},${item.longitude}` : item.location)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in Google Maps <ArrowRight />
                    </a>
                  </div>
                  <BusinessMapFrame
                    location={item.location}
                    latitude={item.latitude}
                    longitude={item.longitude}
                  />
                </section>
              )}
              {publicCustomFields.some((field) => item.customValues?.[field.slug] !== undefined && item.customValues?.[field.slug] !== "") && (
                <section className="panel detail-section listing-custom-details">
                  <h3 className="detail-section-title">More business details</h3>
                  <div>
                    {publicCustomFields.map((field) => {
                      const value = item.customValues?.[field.slug];
                      if (value === undefined || value === "" || value === false) return null;
                      return <article key={field.id}><small>{field.name}</small><strong>{value === true ? "Yes" : String(value)}</strong></article>;
                    })}
                  </div>
                </section>
              )}
              {gallery.length > 0 && (
                <section className="panel detail-section">
                  <h3 className="detail-section-title">Gallery</h3>
                  <div className="project-grid">
                    {gallery.map((source, index) => (
                      <img
                        src={source}
                        alt={`${item.name} gallery ${index + 1}`}
                        key={`${source.slice(0, 45)}-${index}`}
                      />
                    ))}
                  </div>
                </section>
              )}
              {item.video && (
                <section className="panel detail-section listing-video">
                  <h3 className="detail-section-title">Featured video</h3>
                  {detailVideoEmbed ? (
                    <iframe
                      title={`${item.name} featured video`}
                      src={detailVideoEmbed}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : (
                    <a href={item.video} target="_blank" rel="noreferrer">
                      <Globe /> Watch the featured video
                    </a>
                  )}
                </section>
              )}
              {item.attachments?.length > 0 && (
                <section className="panel detail-section listing-attachments">
                  <h3 className="detail-section-title">Attachments</h3>
                  <div className="listing-attachments-grid">
                    {item.attachments.map((file, index) => (
                      <a
                        href={file.data || file.url || "#"}
                        download={file.name}
                        key={`${file.name}-${index}`}
                      >
                        <FileText />
                        <span>
                          <strong>{file.name}</strong>
                          <small>{file.type || "Business attachment"}</small>
                        </span>
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </article>
          <aside className="inquiry-card listing-inquiry-card">
            <header className="inquiry-card-header">
              <span>Connect with this business</span>
              <div className="inquiry-card-brand">
                {item.logo ? <img src={item.logo} alt="" /> : <Storefront weight="duotone" />}
                <div>
                  <h2>{item.cardTitle?.trim() || item.name}</h2>
                  <p>Send a direct inquiry to {item.name}.</p>
                </div>
              </div>
            </header>
            <h3 className="inquiry-card-form-title">Inquiry form</h3>
            {sent ? (
              <div className="success">
                <CheckCircle size={45} weight="fill" />
                <h3>Inquiry sent</h3>
                <p>{item.name} will receive your message.</p>
                <button onClick={() => setSent(false)}>Send another</button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  recordNotificationEvent("inquiry-received", { recipient: item.email || item.owner });
                  setSent(true);
                }}
              >
                <label>
                  Name
                  <input required placeholder="First and last name" />
                </label>
                <label>
                  Email
                  <input required type="email" placeholder="you@example.com" />
                </label>
                <label>
                  Message
                  <textarea
                    required
                    rows="5"
                    placeholder={`I'm interested in ${item.name}...`}
                  />
                </label>
                <GreenButton type="submit" icon={<ArrowRight />}>
                  Submit
                </GreenButton>
              </form>
            )}
            <div className="contact-actions" aria-label="Business contact options">
              {item.phone ? (
                <a href={`tel:${item.phone}`}>
                  <Phone /> Call
                </a>
              ) : (
                <span>
                  <Phone /> Call
                </span>
              )}
              {item.email ? (
                <a href={`mailto:${item.email}`}>
                  <EnvelopeSimple /> Email
                </a>
              ) : (
                <span>
                  <EnvelopeSimple /> Email
                </span>
              )}
              {item.website ? (
                <a href={item.website} target="_blank" rel="noreferrer">
                  <Globe /> Website
                </a>
              ) : (
                <span>
                  <Globe /> Website
                </span>
              )}
              {item.whatsapp && (
                <a
                  className="contact-action-whatsapp"
                  href={`https://wa.me/${item.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Chat with ${item.name} on WhatsApp`}
                >
                  <ChatCircleText weight="fill" /> WhatsApp
                </a>
              )}
              {item.viber && (
                <a
                  className="contact-action-viber"
                  href={`viber://chat?number=${encodeURIComponent(item.viber.replace(/\D/g, ""))}`}
                  aria-label={`Chat with ${item.name} on Viber`}
                >
                  <ChatCircleText weight="fill" /> Viber
                </a>
              )}
            </div>
          </aside>
        </div>
      </main>
    </PublicLayout>
  );
}

function InfoPageHero({ title, image }) {
  return (
    <section
      className="info-page-hero"
      style={{
        backgroundImage: `linear-gradient(90deg,rgba(3,24,18,.78),rgba(3,24,18,.42)),url(${image})`,
      }}
    >
      <h1>{title}</h1>
    </section>
  );
}

const aboutIdentity = [
  [UserCircle, "For Seekers", "Find trusted partners faster"],
  [UsersThree, "For Communities", "Better local connections"],
  [Buildings, "For Businesses", "Get discovered by people actively searching"],
];
const aboutMission = [
  [ListBullets, "Too Much Clutter", "Endless options, unclear choices."],
  [XCircle, "Low Relevance", "Wrong matches waste time."],
  [WarningCircle, "Hard to Trust", "Incomplete or outdated information."],
];
const aboutVision = [
  [MagnifyingGlass, "Clear Discovery", "Find the right businesses faster."],
  [
    Eye,
    "Better Business Visibility",
    "Be discovered by people actively searching.",
  ],
  [
    ShareNetwork,
    "Stronger Local Connections",
    "Connect communities with trusted businesses.",
  ],
];

function FeatureRows({ items }) {
  return (
    <div className="info-feature-list">
      {items.map(([Icon, title, copy]) => (
        <div key={title}>
          <span>
            <Icon weight="bold" />
          </span>
          <p>
            <strong>{title}</strong>
            <small>{copy}</small>
          </p>
        </div>
      ))}
    </div>
  );
}

function InfoCards({ kicker, title, intro, items, numbered = false }) {
  return (
    <section className="info-cards-section">
      <span className="info-kicker light">{kicker}</span>
      <h2>{title}</h2>
      <p>{intro}</p>
      <div className="info-card-grid">
        {items.map(([Icon, name, copy], index) => (
          <article key={name}>
            {numbered && (
              <span className="step-label">
                STEP {String(index + 1).padStart(2, "0")}
              </span>
            )}
            <i>
              <Icon weight="bold" />
            </i>
            <h3>{name}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function AboutPage({ go }) {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState(null);
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const subscribeNewsletter = async (event) => {
    event.preventDefault();
    setNewsletterLoading(true);
    setNewsletterStatus(null);
    try {
      const response = await fetch("/api/newsletter/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: newsletterEmail, source: "about-page" }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Newsletter signup could not be completed.");
      setNewsletterStatus({ type: "success", message: payload.message });
      setNewsletterEmail("");
    } catch (error) { setNewsletterStatus({ type: "error", message: error.message }); }
    finally { setNewsletterLoading(false); }
  };
  const values = [
    [ChatCircleText, "No Noise", "Clarity over clutter."],
    [MagnifyingGlass, "Structured Discovery", "Organized information."],
    [UsersThree, "Credibility", "Complete and trustworthy profiles."],
  ];
  const seekerSteps = [
    [MagnifyingGlass, "Search", "Choose category and location."],
    [ChartLineUp, "Compare", "View services and key details clearly."],
    [ChatCircleText, "Connect", "Connect to businesses that match your needs."],
  ];
  const businessSteps = [
    [
      FileText,
      "Create Your Listing",
      "Add your business profile, services, and key details.",
    ],
    [
      CheckCircle,
      "Get Discovered",
      "Your business appears when people search by category and location.",
    ],
    [
      ChatCircleText,
      "Receive Inquiries",
      "Connect with people who are actively looking for what you offer.",
    ],
  ];
  return (
    <PublicLayout go={go}>
      <InfoPageHero title="ABOUT FINDRA" image="/assets/about-banner.jpg" />
      <main className="about-page">
        <section className="about-image-card who-card">
          <div>
            <span className="info-kicker">WHO WE ARE</span>
            <h2>
              Built for seekers. Designed
              <br />
              for growth-minded businesses.
            </h2>
            <p>
              Findra is a curated business discovery platform that organizes
              businesses by what they actually offer—so people stop guessing and
              start finding the right match.
            </p>
            <FeatureRows items={aboutIdentity} />
          </div>
        </section>
        <section className="about-image-card mission-card">
          <div>
            <span className="info-kicker">MISSION</span>
            <h2>Why the platform exists</h2>
            <p>
              To make the discovery and showcasing of businesses in the
              Philippines effortless and noise-free.
            </p>
            <FeatureRows items={aboutMission} />
          </div>
        </section>
        <section className="about-image-card vision-card">
          <div>
            <span className="info-kicker">VISION</span>
            <h2>Aspirational future</h2>
            <p>
              The Philippines’ go-to platform where businesses shine and seekers
              find the right partners.
            </p>
            <FeatureRows items={aboutVision} />
          </div>
        </section>
        <InfoCards
          kicker="BRAND VALUES"
          title="Guiding principles"
          intro="We simplify business discovery by focusing on clarity, structure, and trust."
          items={values}
        />
        <InfoCards
          kicker="HOW IT WORKS FOR SEEKERS"
          title="Find the right partners - fast"
          intro="No Noise — We cut through the clutter so businesses are showcased clearly and finders get what they need without distractions."
          items={seekerSteps}
          numbered
        />
        <InfoCards
          kicker="HOW IT WORKS FOR BUSINESSES"
          title="Get discovered by the right customers"
          intro="Join Findra and showcase your business clearly so people who are actively searching can find and connect with you."
          items={businessSteps}
          numbered
        />
        <section className="updates-signup">
          <h2>
            <span>Sign up</span> to receive the latest
            <br />
            updates and news
          </h2>
          <form onSubmit={subscribeNewsletter}>
            <label>
              <EnvelopeSimple />
              <input
                aria-label="Email for Findra updates"
                type="email"
                placeholder="Email"
                value={newsletterEmail}
                onChange={(event) => setNewsletterEmail(event.target.value)}
                required
              />
            </label>
            <button aria-label="Subscribe" disabled={newsletterLoading}>
              <ArrowRight />
            </button>
          </form>
          {newsletterStatus && <p className={`newsletter-status ${newsletterStatus.type}`} role="status">{newsletterStatus.message}</p>}
        </section>
      </main>
    </PublicLayout>
  );
}

function ContactPage({ go }) {
  const [sent, setSent] = useState(false);
  return (
    <PublicLayout go={go}>
      <InfoPageHero title="CONTACT US" image="/assets/contact-banner.jpg" />
      <main className="contact-page">
        <section className="contact-intro">
          <span className="info-kicker muted">How Can We Help?</span>
          <h2>
            Questions, feedback,
            <br />
            support - we're ready to help
          </h2>
          <p>
            Have a question about Findra, your business listing, or how the
            platform works? Our team is here to help. Reach out anytime and
            we’ll get back to you as soon as possible.
          </p>
          <GreenButton onClick={() => go("/faq")}>Read our FAQs</GreenButton>
        </section>
        <section className="contact-form-card">
          <h3>Send a message</h3>
          {sent ? (
            <div className="contact-success">
              <CheckCircle weight="fill" />
              <h3>Message ready</h3>
              <p>
                Thanks for reaching out. The Findra team will get back to you
                soon.
              </p>
              <button onClick={() => setSent(false)}>
                Send another message
              </button>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setSent(true);
              }}
            >
              <label>
                Name *<input required aria-label="Name" />
              </label>
              <label>
                Email *<input required type="email" aria-label="Email" />
              </label>
              <label>
                Phone
                <input type="tel" aria-label="Phone" />
              </label>
              <label>
                Message *<textarea required rows="6" aria-label="Message" />
              </label>
              <label className="privacy-check">
                <input required type="checkbox" />
                <span>
                  I have read and agree to the{" "}
                  <Link to="/legal#privacy-policy" go={go}>
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link to="/legal#terms-of-use" go={go}>
                    Terms of Use
                  </Link>
                  .
                </span>
              </label>
              <GreenButton type="submit">Send</GreenButton>
            </form>
          )}
        </section>
      </main>
    </PublicLayout>
  );
}

function PackagesPage({ go }) {
  return (
    <PublicLayout go={go}>
      <InfoPageHero
        title="BUSINESS LISTING PACKAGE"
        image="/assets/cta-background.png"
      />
      <main className="packages-page">
        <section className="packages-intro">
          <span className="info-kicker">Simple, transparent pricing</span>
          <h2>One package. Everything your business needs to be discovered.</h2>
          <p>
            You do not need an account to review the price or inclusions. Start
            as a guest, complete your business details, then create or sign in
            to your account before secure checkout.
          </p>
        </section>
        <section className="public-package-card">
          <div className="public-package-main">
            <span className="public-package-badge">Findra Business Listing</span>
            <h2>
              ₱{findraPlan.amount.toLocaleString()}
              <small> / {findraPlan.billing}</small>
            </h2>
            <p>
              An annual business profile built for visibility, credibility,
              and direct customer inquiries.
            </p>
            <GreenButton onClick={() => go("/add-listing")}>
              Start your listing
            </GreenButton>
            <small className="package-account-note">
              No registration required to begin. Account creation happens
              before checkout so your draft stays protected.
            </small>
          </div>
          <div className="public-package-inclusions">
            <span>EVERYTHING INCLUDED</span>
            <ul>
              <li><CheckCircle weight="fill" /> Complete public business profile</li>
              <li><CheckCircle weight="fill" /> Categories and multiple services</li>
              <li><CheckCircle weight="fill" /> Logo, featured image, gallery, and video</li>
              <li><CheckCircle weight="fill" /> Customer inquiry and direct contact tools</li>
              <li><CheckCircle weight="fill" /> Business-owner dashboard access</li>
              <li><CheckCircle weight="fill" /> Annual listing renewal</li>
            </ul>
          </div>
        </section>
        <section className="package-clarity-row">
          <article><ShieldCheck /><div><strong>See the price first</strong><p>Review everything before entering business or account details.</p></div></article>
          <article><CreditCard /><div><strong>Secure PayMongo checkout</strong><p>Payment happens only after your listing and account are ready.</p></div></article>
          <article><CheckCircle /><div><strong>Reviewed before publishing</strong><p>Your paid listing enters Findra’s approval workflow before going live.</p></div></article>
        </section>
      </main>
    </PublicLayout>
  );
}

const faqGroups = [
  [
    "General FAQs (for everyone)",
    [
      [
        "What is Findra?",
        "Findra is an online platform that connects businesses looking for reliable suppliers with verified vendors across various industries. Our goal is to make sourcing faster, easier, and more transparent.",
      ],
      [
        "Is there a cost to use the platform?",
        "Using Findra as a buyer or seeker is free. Businesses currently have one annual Findra Business Listing package at ₱999. Anyone can review the package before registering on the public Packages page.",
      ],
      [
        "Is my information secure?",
        "Yes. We use industry-standard security and data protection measures to ensure your personal and business information remains safe.",
      ],
    ],
  ],
  [
    "For Buyers / Seekers of Suppliers",
    [
      [
        "How can I find suppliers?",
        "You can easily search by category, sub-category, location, or keyword using our advanced search filters.",
      ],
      [
        "How do I contact a supplier?",
        "Use the built-in inquiry form to send a secure message. You can also view a supplier’s website, social pages, and additional contact information when provided.",
      ],
      [
        "Are suppliers verified?",
        "All listed suppliers undergo an approval and screening process. Buyers should still conduct their own due diligence before entering into any agreement.",
      ],
      [
        "What if I have issues with a supplier?",
        "We encourage both parties to resolve issues directly. For fraud, unresponsiveness, or serious concerns, contact our support team and we’ll review the situation promptly.",
      ],
      [
        "Can I leave reviews for suppliers?",
        "Yes. After a transaction or collaboration, you can rate and review suppliers. Reviews are moderated before publication to support fair and authentic feedback.",
      ],
    ],
  ],
  [
    "For Suppliers / Vendors",
    [
      [
        "How do I join and list my business?",
        "Open the public Packages page to review the Findra Business Listing plan, then select Start your listing. You can complete the business details as a guest; Findra only asks you to create an account or sign in before checkout.",
      ],
      [
        "Is there a fee to feature my business?",
        "Yes. Findra currently offers one annual Business Listing package at ₱999. The price, inclusions, and renewal terms are visible on the public Packages page before you register or begin checkout.",
      ],
      [
        "How do I respond to buyer inquiries or RFQs?",
        "You’ll receive an email notification when a buyer sends an inquiry. You can respond on the platform and send quotations or proposals.",
      ],
      [
        "Can I update my profile or product listings later?",
        "Yes. You can edit your business profile, add products, and update details from your dashboard. Revisions are reviewed before they go live.",
      ],
      [
        "How can I improve my visibility on the platform?",
        "Complete your profile, respond promptly, maintain strong buyer ratings, share your listing on your own channels, and encourage trusted businesses to join Findra.",
      ],
    ],
  ],
];

function FAQPage({ go }) {
  const [open, setOpen] = useState(() =>
    Object.fromEntries(faqGroups.map(([, items]) => [items[0][0], true])),
  );
  return (
    <PublicLayout go={go}>
      <InfoPageHero
        title="FREQUENTLY ASKED QUESTIONS"
        image="/assets/faq-banner.jpg"
      />
      <main className="faq-page">
        {faqGroups.map(([group, items]) => (
          <section key={group}>
            <h2>{group}</h2>
            <div className="faq-list">
              {items.map(([question, answer]) => (
                <article
                  className={open[question] ? "open" : ""}
                  key={question}
                >
                  <button
                    aria-expanded={Boolean(open[question])}
                    onClick={() =>
                      setOpen((current) => ({
                        ...current,
                        [question]: !current[question],
                      }))
                    }
                  >
                    <span>{open[question] ? "−" : "+"}</span>
                    {question}
                  </button>
                  {open[question] && <p>{answer}</p>}
                </article>
              ))}
            </div>
          </section>
        ))}
      </main>
    </PublicLayout>
  );
}

const legalSections = [
  [
    "Privacy Policy",
    [
      "We collect information from users to provide and improve our platform. This includes name, email address, mobile number, location, and business interests for visitors, and business name, address, contact details, logo/images, description, categories, and subscription information for registered businesses. Automatically collected information such as IP address, device type, browser information, and usage data helps us understand and enhance platform performance.",
      "The information we collect is used to operate the platform, communicate updates, manage subscriptions, analyze usage, and support businesses in connecting with the right customers. We store all data securely and limit access to authorized personnel only. Third-party services, such as payment processors and analytics tools, may process some information on our behalf in accordance with their privacy practices.",
      "Users may request access to, correction of, or deletion of their personal information by contacting us at hello@findra.ph and can unsubscribe from emails at any time. We may use cookies or similar technologies to improve user experience and platform functionality.",
    ],
  ],
  [
    "Terms of Use",
    [
      "By using this platform, you agree to these Terms of Use. The platform is designed to help businesses be discovered and for users to connect with suppliers and service providers in the Philippines. Users must provide accurate information when registering, and all submissions must comply with applicable laws.",
      "Businesses may create accounts and subscribe to list their profiles. Users are responsible for maintaining the confidentiality of their account credentials. Subscriptions grant access to the platform’s services as described, and access may be suspended or terminated for violations of these Terms.",
      "Users are responsible for the content they submit, including business descriptions, images, and service listings. Prohibited conduct includes submitting false information, infringing intellectual property, spamming, or any activity that violates laws.",
      "Payments for subscriptions are processed via integrated payment gateways. Subscription fees are non-refundable unless otherwise stated.",
      "These Terms may be updated from time to time. Continued use of the platform constitutes acceptance of the updated Terms.",
    ],
  ],
  [
    "Disclaimer & Limitations",
    [
      "The platform is provided for general informational and discovery purposes only. While we strive to present accurate, complete, and up-to-date information and may review business submissions, we do not guarantee the accuracy, completeness, reliability, or suitability of any listing.",
      "All business profiles, contact details, descriptions, images, and service offerings are submitted and maintained by the respective businesses. Users are encouraged to conduct their own due diligence before engaging with a listed business.",
      "Transactions, communications, or agreements between users and businesses occur directly between those parties. Findra is not a party to such transactions and is not responsible for resulting disputes or losses.",
      "Reports of abuse may be reviewed at Findra’s discretion. Submission of a report does not guarantee investigation, action, or removal.",
      "Contact details displayed on business profiles are supplied for customer inquiries. Findra is not responsible for third-party misuse of those details.",
      "Service interruptions may occur because of maintenance, system limitations, or circumstances beyond our control. To the fullest extent permitted by law, the platform disclaims liability arising from use of, or reliance on, its content.",
    ],
  ],
];

function LegalPage({ go }) {
  useEffect(() => {
    const target = window.location.hash.slice(1);
    if (!target) return;
    window.requestAnimationFrame(() =>
      document.getElementById(target)?.scrollIntoView({ behavior: "smooth" }),
    );
  }, []);
  return (
    <PublicLayout go={go}>
      <InfoPageHero title="LEGAL & POLICIES" image="/assets/legal-banner.jpg" />
      <main className="legal-page">
        {legalSections.map(([title, paragraphs]) => (
          <article
            id={title.toLowerCase().replace(/\s*&\s*|\s+/g, "-")}
            key={title}
          >
            <h2>{title}</h2>
            <strong>Effective Date: January 01, 2026</strong>
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </article>
        ))}
      </main>
    </PublicLayout>
  );
}

function LoginPage({ go, onLogin }) {
  const [tab, setTab] = useState("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await authRequest(
        tab === "register" ? "/api/auth/register" : "/api/auth/login",
        tab === "register"
          ? { name, email: username, password }
          : { email: username, password },
      );
      onLogin(sessionFromUser(result.user));
    } catch (requestError) {
      setError(requestError.message || "We could not sign you in.");
    } finally {
      setSubmitting(false);
    }
    return;
    const account = Object.values(demoAccounts).find(
      (x) =>
        x.username.toLowerCase() === username.trim().toLowerCase() &&
        x.password === password,
    );
    if (!account) {
      setError("That username or password doesn’t match a demo account.");
      return;
    }
    onLogin(account);
  };
  const useAccount = (account) => {
    setUsername(account.username);
    setPassword(account.password);
    setError("");
  };
  return (
      <main className="auth-page">
        <button className="auth-back" onClick={() => go("/")}><ArrowLeft /> Back to Findra</button>
        <ThemeToggle />
        <section className="auth-shell">
          <aside className="auth-brand-panel">
            <BrandLogo />
            <div className="auth-brand-copy">
              <span className="section-eyebrow">FIND THE RIGHT PARTNER, FAST.</span>
              <h1>Get discovered with Findra.</h1>
              <p>Create your account to manage your business, receive inquiries, and keep your listing current.</p>
            </div>
            <div className="auth-steps">
              <article className="active"><b>1</b><span><strong>Create your account</strong><small>Join the Findra community</small></span></article>
              <article><b>2</b><span><strong>Add your business</strong><small>Build a complete public profile</small></span></article>
              <article><b>3</b><span><strong>Get discovered</strong><small>Connect with new customers</small></span></article>
            </div>
          </aside>
          <div className="auth-card">
          <div className="auth-top">
            <div><span className="section-eyebrow">{tab === "login" ? "WELCOME BACK" : "CREATE YOUR ACCOUNT"}</span><h2>{tab === "login" ? "Sign in to Findra" : "Start your Findra journey"}</h2><p>{tab === "login" ? "Manage your business and account in one place." : "It only takes a moment to get started."}</p></div>
          </div>
          <div className="auth-tabs">
            <button
              className={tab === "login" ? "active" : ""}
              onClick={() => setTab("login")}
            >
              Login
            </button>
            <button
              className={tab === "register" ? "active" : ""}
              onClick={() => setTab("register")}
            >
              Register
            </button>
          </div>
          <form onSubmit={submit}>
            {tab === "register" && (
              <label>
                <UserCircle />
                <span>Full name</span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Your full name"
                />
              </label>
            )}
            <label>
              <EnvelopeSimple />
              <span>Email address</span>
              <input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="Email address"
              />
            </label>
            <label>
              <WarningCircle />
              <span>Password</span>
              <input
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Password"
              />
            </label>
            {error && (
              <p className="auth-error">
                <WarningCircle />
                {error}
              </p>
            )}
            <div className="auth-options">
              <label>
                <input type="checkbox" defaultChecked /> Remember me
              </label>
              <span>Secure access to your account and listing.</span>
            </div>
            <GreenButton disabled={submitting} type="submit" icon={<ArrowRight />}>
              {submitting
                ? "Please wait..."
                : tab === "login"
                  ? "Login"
                  : "Create Account"}
            </GreenButton>
          </form>
          <p className="auth-switch">{tab === "login" ? "New to Findra?" : "Already have an account?"} <button type="button" onClick={() => setTab(tab === "login" ? "register" : "login")}>{tab === "login" ? "Create an account" : "Sign in"}</button></p>
          </div>
        </section>
      </main>
  );
}

const sideItems = [
  ["Overview", SquaresFour],
  ["Listings", Buildings],
  ["Users", UsersThree],
  ["Inquiries", ChatCircleText],
  ["Subscriptions", CreditCard],
  ["Automation", ArrowsClockwise],
  ["Settings", Gear],
];

function NotificationInbox() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const inboxRef = useRef(null);
  useEffect(() => {
    const closeOnOutsidePress = (event) => {
      if (inboxRef.current && !inboxRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, []);
  const refresh = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications", { credentials: "same-origin" });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) setItems(payload.notifications || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (open) refresh(); }, [open]);
  const unread = items.filter((item) => !item.read_at).length;
  const markRead = async (item) => {
    if (item.read_at) return;
    await fetch(`/api/notifications/${item.id}/read`, { method: "PATCH", credentials: "same-origin" }).catch(() => {});
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry));
  };
  return <div className="notification-inbox" ref={inboxRef}>
    <button className="icon-button" aria-label="Open notifications" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <Bell />
      {unread > 0 && <i />}
    </button>
    {open && <section className="notification-popover">
      <header><div><span>Activity</span><h3>Notifications</h3></div><button onClick={refresh} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button></header>
      <div className="notification-popover-list">
        {items.map((item) => <button key={item.id} className={item.read_at ? "read" : "unread"} onClick={() => markRead(item)}>
          <CheckCircle weight="fill" />
          <span><strong>{item.title}</strong><small>{item.body}</small><em>{new Date(item.created_at).toLocaleString()}</em></span>
        </button>)}
        {!loading && !items.length && <p>No account activity yet.</p>}
      </div>
    </section>}
  </div>;
}

function AutomationManagement({ onNotify }) {
  const mergeFields = [
    ["{{contactFirstName}}", "Contact first name"],
    ["{{contactFullName}}", "Contact full name"],
    ["{{contactEmail}}", "Contact email"],
    ["{{businessName}}", "Business name"],
    ["{{businessUrl}}", "Public listing link"],
    ["{{dashboardUrl}}", "User dashboard link"],
    ["{{adminUrl}}", "Admin review link"],
    ["{{supportEmail}}", "Support email"],
    ["{{currentYear}}", "Current year"],
  ];
  const [templates, setTemplates] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channel, setChannel] = useState("email");
  const [textbee, setTextbee] = useState(null);
  const [testPhone, setTestPhone] = useState("");
  const [actions, setActions] = useState([]);
  const [smsTemplates, setSmsTemplates] = useState([]);
  const editorRef = useRef(null);
  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/automations/templates", { credentials: "same-origin" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Email templates could not be loaded.");
      setTemplates(payload.templates || []);
      const next = payload.templates?.find((item) => item.event === selectedEvent) || payload.templates?.[0] || null;
      setSelectedEvent(next?.event || "");
      setForm(next);
      const integrationResponse = await fetch("/api/textbee/integration", { credentials: "same-origin" });
      const integrationPayload = await integrationResponse.json().catch(() => ({}));
      if (integrationResponse.ok) setTextbee(integrationPayload);
      const actionsResponse = await fetch("/api/automations/actions", { credentials: "same-origin" });
      const actionsPayload = await actionsResponse.json().catch(() => ({}));
      if (actionsResponse.ok) setActions(actionsPayload.actions || []);
      const smsResponse = await fetch("/api/automations/sms-templates", { credentials: "same-origin" });
      const smsPayload = await smsResponse.json().catch(() => ({}));
      if (smsResponse.ok) setSmsTemplates(smsPayload.templates || []);
    } catch (error) {
      onNotify?.({ type: "error", title: "Automation could not be loaded", message: error.message });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const choose = (event) => {
    const next = templates.find((item) => item.event === event);
    setSelectedEvent(event);
    setForm(next ? { ...next } : null);
  };
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const format = (command) => {
    editorRef.current?.focus();
    document.execCommand(command, false, null);
    update("body_html", editorRef.current?.innerHTML || "");
  };
  const insertField = (token) => {
    editorRef.current?.focus();
    document.execCommand("insertText", false, token);
    update("body_html", editorRef.current?.innerHTML || "");
  };
  const save = async (event) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/automations/templates/${form.event}`, {
        method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, body_html: editorRef.current?.innerHTML || form.body_html }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "The email template could not be saved.");
      setTemplates((current) => current.map((item) => item.event === payload.template.event ? payload.template : item));
      setForm(payload.template);
      onNotify?.({ type: "success", title: "Email template saved", message: `${payload.template.name} will be used for the next matching automation.` });
    } catch (error) {
      onNotify?.({ type: "error", title: "Email template could not be saved", message: error.message });
    } finally { setSaving(false); }
  };
  const testSms = async () => {
    try {
      const response = await fetch("/api/textbee/test", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient: testPhone }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Textbee could not send the test SMS.");
      onNotify?.({ type: "success", title: "Test SMS sent", message: "Textbee accepted the request. Check the recipient phone and connected Android device." });
    } catch (error) { onNotify?.({ type: "error", title: "SMS test failed", message: error.message }); }
  };
  const createAction = async (action) => {
    const response = await fetch("/api/automations/actions", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Automation action could not be saved.");
    setActions((current) => [...current, payload.action]);
  };
  const removeAction = async (id) => {
    const response = await fetch(`/api/automations/actions/${id}`, { method: "DELETE", credentials: "same-origin" });
    if (!response.ok) throw new Error("Automation action could not be removed.");
    setActions((current) => current.filter((item) => item.id !== id));
  };
  return <div className="admin-content automation-module">
    <section className="welcome-row automation-hero"><div><span className="section-eyebrow">Email automation</span><h2>Automation & email templates</h2><p>Configure the sender, subject, reply-to address, and branded content used by Findra emails.</p></div><button type="button" className="secondary-button" onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh templates"}</button></section>
    {loading && <section className="panel automation-empty"><Clock /><h3>Loading email templates…</h3></section>}
    <nav className="automation-channel-tabs" aria-label="Automation channels"><button type="button" className={channel === "email" ? "active" : ""} onClick={() => setChannel("email")}><EnvelopeSimple /> Email</button><button type="button" className={channel === "sms" ? "active" : ""} onClick={() => setChannel("sms")}><Phone /> SMS</button></nav>
    {!loading && !form && <section className="panel automation-empty"><EnvelopeSimple /><h3>No email templates available</h3><p>Run the database migration, then refresh this page.</p></section>}
    {!loading && form && channel === "email" && <><div className="automation-layout">
      <aside className="panel automation-template-list"><span className="section-eyebrow">Automations</span><h3>Email triggers</h3><p>Each template sends when its matching Findra activity occurs.</p><div>{templates.map((item) => <button type="button" className={item.event === selectedEvent ? "active" : ""} onClick={() => choose(item.event)} key={item.event}><EnvelopeSimple /><span><strong>{item.name}</strong><small>{item.active ? "Enabled" : "Paused"}</small></span></button>)}</div></aside>
      <form className="panel automation-editor" onSubmit={save}>
        <header><div><span className="section-eyebrow">Transactional email</span><h3>{form.name}</h3><p>Use the system fields below to personalise the content for each recipient.</p></div><label className="automation-toggle"><input type="checkbox" checked={form.active !== false} onChange={(event) => update("active", event.target.checked)} /><span>{form.active !== false ? "Enabled" : "Paused"}</span></label></header>
        <section className="merge-field-library"><span>System fields</span><div>{mergeFields.map(([token, label]) => <button type="button" key={token} onClick={() => insertField(token)} title={`Insert ${label}`}><code>{token}</code><small>{label}</small></button>)}</div></section>
        <div className="management-form-grid">
          <label><span>From name *</span><input required value={form.from_name || ""} onChange={(event) => update("from_name", event.target.value)} placeholder="Findra PH" /></label>
          <label><span>From email *</span><input required type="email" value={form.from_email || ""} onChange={(event) => update("from_email", event.target.value)} placeholder="hello@findra.ph" /></label>
          <label className="management-wide-field"><span>Reply-to email</span><input type="email" value={form.reply_to || ""} onChange={(event) => update("reply_to", event.target.value)} placeholder="hello@findra.ph" /></label>
          <label className="management-wide-field"><span>Subject line *</span><input required value={form.subject || ""} onChange={(event) => update("subject", event.target.value)} /></label>
          <div className="management-wide-field rich-email-field"><span>Email content *</span><div className="rich-email-toolbar" role="toolbar" aria-label="Email formatting"><button type="button" onClick={() => format("bold")}><TextBolder /></button><button type="button" onClick={() => format("italic")}><TextItalic /></button><button type="button" onClick={() => format("insertUnorderedList")}><ListBullets /></button></div><div ref={editorRef} className="rich-email-editor" contentEditable suppressContentEditableWarning onInput={(event) => update("body_html", event.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: form.body_html || "" }} /></div>
        </div>
        <footer><small>Recommendation: keep transactional emails concise, use the verified <strong>hello@findra.ph</strong> sender, and include one clear action.</small><button className="admin-primary" disabled={saving} type="submit"><CheckCircle />{saving ? "Saving…" : "Save template"}</button></footer>
      </form>
    </div><AutomationActionCreator channel="email" templates={templates} actions={actions} onCreate={createAction} onRemove={removeAction} onNotify={onNotify} /></>}
    {!loading && channel === "sms" && <><section className="panel sms-integration-card"><span className="section-eyebrow">SMS automation</span><h3>{textbee?.ready ? "Findra SMS is ready" : "Connect your SMS service"}</h3><p>Send short, branded updates after important Findra activity. Full details stay in the matching email.</p><div className="sms-status-grid"><div><small>Connection</small><strong>{textbee?.ready ? "Connected" : textbee?.configured ? "Configured but disabled" : "Not configured"}</strong></div><div><small>Delivery</small><strong>Branded Findra SMS</strong></div></div><label><span>Send a test SMS</span><div className="sms-test-row"><input value={testPhone} onChange={(event) => setTestPhone(event.target.value)} placeholder="+639171234567" /><button type="button" className="admin-primary" disabled={!textbee?.ready} onClick={testSms}>Send test</button></div></label><small>Use E.164 format. The default SMS messages use Findra fields and direct recipients to their email for complete information.</small></section><SmsTemplateManager templates={smsTemplates} setTemplates={setSmsTemplates} onNotify={onNotify} /><AutomationActionCreator channel="sms" templates={templates} actions={actions} onCreate={createAction} onRemove={removeAction} onNotify={onNotify} /></>}
  </div>;
}

function SmsTemplateManager({ templates, setTemplates, onNotify }) {
  const [selectedEvent, setSelectedEvent] = useState("");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { const next = templates.find((item) => item.event === selectedEvent) || templates[0] || null; setSelectedEvent(next?.event || ""); setForm(next ? { ...next } : null); }, [templates]);
  const choose = (event) => { const next = templates.find((item) => item.event === event); setSelectedEvent(event); setForm(next ? { ...next } : null); };
  const save = async (event) => { event.preventDefault(); if (!form) return; setSaving(true); try { const response = await fetch(`/api/automations/sms-templates/${form.event}`, { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || "SMS copy could not be saved."); setTemplates((current) => current.map((item) => item.event === payload.template.event ? payload.template : item)); setForm(payload.template); onNotify?.({ type: "success", title: "SMS copy saved", message: `${payload.template.name} will be used for the next matching SMS.` }); } catch (error) { onNotify?.({ type: "error", title: "SMS copy could not be saved", message: error.message }); } finally { setSaving(false); } };
  if (!form) return <section className="panel automation-empty"><Phone /><h3>SMS templates unavailable</h3><p>Run the database migration, then refresh Automation.</p></section>;
  return <section className="sms-template-manager"><aside className="panel automation-template-list"><span className="section-eyebrow">SMS triggers</span><h3>Default SMS templates</h3><p>Every core Findra event has a short branded SMS. You control the wording and delivery state.</p><div>{templates.map((item) => <button type="button" className={item.event === selectedEvent ? "active" : ""} onClick={() => choose(item.event)} key={item.event}><Phone /><span><strong>{item.name}</strong><small>{item.active ? "Enabled" : "Paused"}</small></span></button>)}</div></aside><form className="panel sms-copy-editor" onSubmit={save}><header><div><span className="section-eyebrow">Branded SMS template</span><h3>{form.name}</h3><p>Keep it concise, use customer fields, and direct recipients to their email for full details.</p></div><label className="automation-toggle"><input type="checkbox" checked={form.active !== false} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} /><span>{form.active !== false ? "Enabled" : "Paused"}</span></label></header><section className="merge-field-library"><span>Available SMS fields</span><div>{[["{{contactFirstName}}", "First name"], ["{{businessName}}", "Business name"], ["{{contactPhone}}", "Phone"]].map(([token, label]) => <button type="button" key={token} onClick={() => setForm((current) => ({ ...current, body: `${current.body || ""}${current.body ? "\n" : ""}${token}` }))}><code>{token}</code><small>{label}</small></button>)}</div></section><label><span>SMS message *</span><textarea required maxLength="500" value={form.body || ""} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} /><small>{(form.body || "").length}/500 characters</small></label><footer><small>SMS messages do not contain links. Use “Check your email for full details.” when useful.</small><button className="admin-primary" type="submit" disabled={saving}><CheckCircle />{saving ? "Saving…" : "Save SMS template"}</button></footer></form></section>;
}

function AutomationActionCreator({ channel, templates, actions, onCreate, onRemove, onNotify }) {
  const [draft, setDraft] = useState({ name: "", event: "listing-submitted", subject: "", body: "" });
  const items = actions.filter((item) => item.channel === channel);
  const save = async (event) => { event.preventDefault(); try { await onCreate({ ...draft, channel }); setDraft({ name: "", event: "listing-submitted", subject: "", body: "" }); onNotify?.({ type: "success", title: `${channel === "sms" ? "SMS" : "Email"} action added`, message: "It will run with the selected Findra event." }); } catch (error) { onNotify?.({ type: "error", title: "Action could not be saved", message: error.message }); } };
  return <section className="panel automation-actions"><header><span className="section-eyebrow">Additional {channel} actions</span><h3>Add a follow-up action</h3><p>Create optional messages without replacing Findra’s core transactional {channel}.</p></header>{items.length > 0 && <div className="automation-action-list">{items.map((item) => <article key={item.id}><div><strong>{item.name}</strong><small>{templates.find((template) => template.event === item.event)?.name || item.event}</small></div><button type="button" onClick={() => onRemove(item.id)}><Trash /> Remove</button></article>)}</div>}<form onSubmit={save} className="automation-action-form"><label><span>Action name *</span><input required value={draft.name} onChange={(event) => setDraft((value) => ({ ...value, name: event.target.value }))} placeholder={`Additional ${channel} action`} /></label><label><span>Run when *</span><select value={draft.event} onChange={(event) => setDraft((value) => ({ ...value, event: event.target.value }))}>{templates.map((template) => <option key={template.event} value={template.event}>{template.name}</option>)}</select></label>{channel === "email" && <label className="management-wide-field"><span>Subject</span><input value={draft.subject} onChange={(event) => setDraft((value) => ({ ...value, subject: event.target.value }))} placeholder="A quick Findra update" /></label>}<label className="management-wide-field"><span>{channel === "sms" ? "SMS message *" : "Email content *"}</span><textarea required value={draft.body} onChange={(event) => setDraft((value) => ({ ...value, body: event.target.value }))} placeholder="Hi {{contactFirstName}}, {{businessName}} has an update." /></label><footer><small>Use <code>{"{{contactFirstName}}"}</code>, <code>{"{{businessName}}"}</code>, and <code>{"{{dashboardUrl}}"}</code>.</small><button type="submit" className="admin-primary"><Plus /> Add action</button></footer></form></section>;
}

function AdminDashboard({ go, listings, setListings, onLogout, onNotify }) {
  const [section, setSection] = usePersistedDashboardSection("findra-admin-section", "Overview");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [toast, setToast] = useState("");
  const [mobileSide, setMobileSide] = useState(false);
  const notify = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2400);
  };
  const update = async (id, next) => {
    try {
      const item = listings.find((listing) => listing.id === id);
      if (!item) throw new Error("Listing not found.");
      const response = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, status: next }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "The listing could not be updated.");
      setListings((items) => items.map((x) => (x.id === id ? payload.listing : x)));
      setSelected((x) => (x ? payload.listing : x));
      setConfirmation(null);
      notify(`Listing ${next.toLowerCase()}`);
      onNotify?.({
        type: "success",
        title: `Listing marked ${next.toLowerCase()}`,
        message: `${item.name || "The business listing"} was updated successfully. The owner has been notified.`,
      });
    } catch (error) {
      onNotify?.({
        type: "error",
        title: "The listing status could not be updated",
        message: error.message || "Please try changing the listing status again.",
      });
    }
  };
  const saveListing = async (record) => {
    try {
      if (record.id) {
        const response = await fetch(`/api/listings/${record.id}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "The listing could not be saved.");
        setListings((items) => items.map((item) => (item.id === record.id ? payload.listing : item)));
        notify("Listing updated");
        onNotify?.({
          type: "success",
          title: "Update confirmed",
          message: `${record.name} now reflects the latest business details and media. You can reopen the listing anytime to make more changes.`,
        });
      } else {
        const response = await fetch("/api/listings", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "The listing could not be saved.");
        setListings((items) => [payload.listing, ...items.filter((item) => item.name !== record.name)]);
        notify("Listing created");
        recordNotificationEvent("listing-pending-admin", { recipient: "Findra admin" });
        recordNotificationEvent("listing-submitted", { recipient: record.email || record.owner });
        onNotify?.({
          type: "success",
          title: "Business listing created",
          message: `${record.name} was added successfully and is ready for review.`,
        });
      }
      setEditing(null);
      setSection("Listings");
      return true;
    } catch (error) {
      onNotify?.({
        type: "error",
        title: "The listing could not be saved",
        message:
          error.message || "Please review the form and try again. Your current entries are still available.",
      });
      return false;
    }
  };
  const removeListing = async (item) => {
    try {
      const response = await fetch(`/api/listings/${item.id}`, { method: "DELETE", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "The listing could not be deleted.");
      setListings((items) => items.filter((x) => x.id !== item.id));
      setSelected(null);
      setEditing(null);
      setConfirmation(null);
      notify("Listing deleted");
      onNotify?.({
        type: "success",
        title: "Business listing deleted",
        message: `${item.name} was removed from the directory.`,
      });
    } catch (error) {
      onNotify?.({
        type: "error",
        title: "The listing could not be deleted",
        message: error.message || "Please try deleting the business listing again.",
      });
    }
  };
  const filtered = listings.filter(
    (l) =>
      (status === "All" || l.status === status) &&
      `${l.name} ${l.owner} ${l.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${mobileSide ? "open" : ""}`}>
        <div className="admin-brand">
          <BrandLogo />
          <span>ADMIN</span>
          <button onClick={() => setMobileSide(false)}>
            <X />
          </button>
        </div>
        <button className="site-return" onClick={() => go("/")}>
          <ArrowLeft /> Back to main site
        </button>
        <nav>
          {sideItems.map(([name, Icon]) => (
            <button
              className={section === name ? "active" : ""}
              key={name}
              onClick={() => {
                setSection(name);
                setMobileSide(false);
              }}
            >
              <Icon />
              {name}
              {name === "Listings" && <span>2</span>}
            </button>
          ))}
        </nav>
        <div className="admin-help">
          <div>
            <ChatCircleText />
          </div>
          <strong>Need a hand?</strong>
          <p>View the admin guide or contact the Findra team.</p>
          <button>Open help center</button>
        </div>
        <button className="signout" onClick={onLogout}>
          <SignOut /> Sign out
        </button>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <button className="admin-menu" onClick={() => setMobileSide(true)}>
            <List />
          </button>
          <div>
            <p>Admin workspace</p>
            <h1>{section}</h1>
          </div>
          <div className="admin-actions">
            <label>
              <MagnifyingGlass />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Findra"
              />
            </label>
            <ThemeToggle />
            <NotificationInbox />
            <div className="admin-user">KS</div>
            <div className="admin-user-copy">
              <strong>Katrina S.</strong>
              <span>Super Admin</span>
            </div>
          </div>
        </header>
        {section === "Overview" ? (
          <Overview
            listings={listings}
            setSection={setSection}
            setSelected={setSelected}
            onCreate={() => setEditing({ ...blankListing })}
          />
        ) : section === "Listings" ? (
          <ListingsAdmin
            rows={filtered}
            allRows={listings}
            query={query}
            setQuery={setQuery}
            status={status}
            setStatus={setStatus}
            setSelected={setSelected}
            setEditing={setEditing}
            update={(id, next) => {
              const item = listings.find((listing) => listing.id === id);
              if (item && next === "Published") setConfirmation({ type: "publish", item });
              else if (item) update(id, next);
            }}
            remove={(item) => setConfirmation({ type: "delete", item })}
          />
        ) : section === "Settings" ? (
          <SettingsAdmin onNotify={onNotify} />
        ) : section === "Users" ? (
          <UsersManagement query={query} onNotify={onNotify} />
        ) : section === "Subscriptions" ? (
          <SubscriptionsManagement onNotify={onNotify} />
        ) : section === "Automation" ? (
          <AutomationManagement onNotify={onNotify} />
        ) : (
          <AdminSection section={section} />
        )}
      </main>
      {selected && (
        <ListingModal
          item={selected}
          close={() => setSelected(null)}
          update={(id, next) => {
            if (next === "Published") setConfirmation({ type: "publish", item: selected });
            else update(id, next);
          }}
          edit={() => {
            setEditing(selected);
            setSelected(null);
          }}
          remove={() => setConfirmation({ type: "delete", item: selected })}
        />
      )}
      {editing && (
        <ListingEditor
          item={editing}
          close={() => setEditing(null)}
          save={saveListing}
          remove={editing.id ? () => setConfirmation({ type: "delete", item: editing }) : null}
        />
      )}
      {toast && (
        <div className="toast">
          <CheckCircle weight="fill" />
          {toast}
        </div>
      )}
      {confirmation && (
        <ListingActionConfirm
          action={confirmation}
          close={() => setConfirmation(null)}
          confirm={() => confirmation.type === "publish" ? update(confirmation.item.id, "Published") : removeListing(confirmation.item)}
        />
      )}
    </div>
  );
}

function OverviewLegacy({ listings, setSection, setSelected }) {
  const pending = listings.filter((x) => x.status === "Pending");
  const metrics = [
    ["Total listings", listings.length, "+12%", Buildings, "green"],
    ["Pending review", pending.length, "Needs attention", Clock, "amber"],
    ["Active users", 184, "+8 this week", UsersThree, "blue"],
    ["Monthly inquiries", 326, "+18.4%", ChatCircleText, "violet"],
  ];
  return (
    <div className="admin-content">
      <section className="welcome-row">
        <div>
          <h2>Good morning, Katrina.</h2>
          <p>Here’s what’s happening across Findra today.</p>
        </div>
        <button
          className="admin-primary"
          onClick={() => setSection("Listings")}
        >
          <Plus /> Add listing
        </button>
      </section>
      <section className="metric-grid">
        {metrics.map(([label, value, note, Icon, tone]) => (
          <article key={label}>
            <div className={`metric-icon ${tone}`}>
              <Icon />
            </div>
            <div className="metric-copy">
              <p>{label}</p>
              <h3>{value}</h3>
              <span className={tone === "amber" ? "attention" : "positive"}>
                {tone !== "amber" && <TrendUp />}
                {note}
              </span>
            </div>
          </article>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="panel performance">
          <div className="panel-head">
            <div>
              <h3>Directory performance</h3>
              <p>Listing views over the last 7 days</p>
            </div>
            <select>
              <option>Last 7 days</option>
              <option>Last 30 days</option>
            </select>
          </div>
          <div className="chart">
            <div className="y-labels">
              <span>1.2k</span>
              <span>900</span>
              <span>600</span>
              <span>300</span>
              <span>0</span>
            </div>
            <div className="bars">
              {[45, 68, 52, 79, 63, 91, 76].map((h, i) => (
                <div key={i}>
                  <span style={{ height: `${h}%` }} />
                  <small>
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                  </small>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="panel review-panel">
          <div className="panel-head">
            <div>
              <h3>Pending review</h3>
              <p>{pending.length} listings need a decision</p>
            </div>
            <button onClick={() => setSection("Listings")}>
              View all <ArrowRight />
            </button>
          </div>
          {pending.map((item) => (
            <button
              className="review-item"
              key={item.id}
              onClick={() => setSelected(item)}
            >
              <img src={item.image} alt="" />
              <span>
                <strong>{item.name}</strong>
                <small>{item.category}</small>
              </span>
              <ArrowRight />
            </button>
          ))}
        </section>
      </div>
      <section className="panel recent">
        <div className="panel-head">
          <div>
            <h3>Recent listings</h3>
            <p>Latest activity in the directory</p>
          </div>
          <button onClick={() => setSection("Listings")}>
            Manage listings <ArrowRight />
          </button>
        </div>
        <ListingTable rows={listings.slice(0, 5)} setSelected={setSelected} />
      </section>
    </div>
  );
}

function Overview(props) {
  const openCreateFromHero = (event) => {
    if (!event.target.closest(".welcome-row .admin-primary")) return;
    event.preventDefault();
    event.stopPropagation();
    props.setSection("Listings");
    props.onCreate();
  };

  return (
    <div className="overview-shell" onClickCapture={openCreateFromHero}>
      <OverviewLegacy {...props} />
    </div>
  );
}

function StatusPill({ status }) {
  const Icon =
    status === "Published"
      ? CheckCircle
      : status === "Pending"
        ? Clock
        : status === "Declined"
          ? XCircle
          : FileText;
  return (
    <span className={`status ${status.toLowerCase()}`}>
      <Icon weight="fill" />
      {status}
    </span>
  );
}

function ListingTable({ rows, setSelected, setEditing, update, remove }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Business</th>
            <th>Category</th>
            <th>Owner</th>
            <th>Status</th>
            <th>Submitted</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id}>
              <td>
                <button
                  className="business-cell"
                  onClick={() => setSelected(item)}
                >
                  <img src={item.image} alt="" />
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      <MapPin weight="fill" />
                      {item.location}
                    </small>
                  </span>
                </button>
              </td>
              <td>{item.category}</td>
              <td>{item.owner}</td>
              <td>
                <StatusPill status={item.status} />
              </td>
              <td>{item.date}</td>
              <td>
                <div className="row-actions">
                  <button
                    title="Preview listing"
                    aria-label={`Preview ${item.name}`}
                    onClick={() => setSelected(item)}
                  >
                    <Eye />
                  </button>
                  {setEditing && (
                    <button
                      title="Edit listing"
                      aria-label={`Edit ${item.name}`}
                      onClick={() => setEditing(item)}
                    >
                      <PencilSimple />
                    </button>
                  )}
                  {update && item.status !== "Published" && (
                    <button
                      title="Publish listing"
                      aria-label={`Publish ${item.name}`}
                      onClick={() => update(item.id, "Published")}
                    >
                      <Check />
                    </button>
                  )}
                  {remove && (
                    <button
                      className="delete-action"
                      title="Delete listing"
                      aria-label={`Delete ${item.name}`}
                      onClick={() => remove(item)}
                    >
                      <Trash />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="admin-empty">
          <Storefront size={38} />
          <h3>No listings found</h3>
          <p>Adjust your filters or create a new business listing.</p>
        </div>
      )}
    </div>
  );
}

function ListingsAdmin({
  rows,
  allRows,
  query,
  setQuery,
  status,
  setStatus,
  setSelected,
  setEditing,
  update,
  remove,
}) {
  return (
    <div className="admin-content">
      <section className="welcome-row">
        <div>
          <h2>Business listings</h2>
          <p>
            Create, review, update, publish, and remove businesses from Findra.
          </p>
        </div>
        <button
          className="admin-primary"
          onClick={() => setEditing({ ...blankListing })}
        >
          <Plus /> Add listing
        </button>
      </section>
      <section className="panel listing-manager">
        <div className="manager-toolbar">
          <label>
            <MagnifyingGlass />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search business, owner, or category"
            />
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>All</option>
            <option>Published</option>
            <option>Pending</option>
            <option>Draft</option>
            <option>Declined</option>
          </select>
          <button
            onClick={() => {
              setQuery("");
              setStatus("All");
            }}
          >
            <X /> Clear filters
          </button>
        </div>
        <header className="management-table-tools listing-table-tools">
          <div>
            <h3>All listings</h3>
            <p>{rows.length} {rows.length === 1 ? "listing" : "listings"} shown</p>
          </div>
          <div className="status-tabs" aria-label="Filter listings by status">
            {["All", "Published", "Pending", "Draft", "Declined"].map((x) => (
              <button
                className={status === x ? "active" : ""}
                onClick={() => setStatus(x)}
                key={x}
              >
                {x}
                <span>
                  {x === "All"
                    ? allRows.length
                    : allRows.filter((r) => r.status === x).length}
                </span>
              </button>
            ))}
          </div>
        </header>
        <ListingTable
          rows={rows}
          setSelected={setSelected}
          setEditing={setEditing}
          update={update}
          remove={remove}
        />
      </section>
    </div>
  );
}

const userSideItems = [
  ["Overview", SquaresFour],
  ["My Listing", Storefront],
  ["Plan & Billing", CreditCard],
  ["Inbox", EnvelopeSimple],
  ["Inquiries", ChatCircleText],
  ["Analytics", ChartLineUp],
  ["Profile", UserCircle],
];

function UserDashboardLegacy({ go, listing, onLogout }) {
  const [section, setSection] = useState("Overview");
  const [mobileSide, setMobileSide] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <div className="admin-shell user-dashboard">
      <aside className={`admin-sidebar ${mobileSide ? "open" : ""}`}>
        <div className="admin-brand">
          <BrandLogo />
          <span>BUSINESS</span>
          <button onClick={() => setMobileSide(false)}>
            <X />
          </button>
        </div>
        <nav>
          {userSideItems.map(([name, Icon]) => (
            <button
              className={section === name ? "active" : ""}
              key={name}
              onClick={() => {
                setSection(name);
                setMobileSide(false);
              }}
            >
              <Icon />
              {name}
              {name === "Inquiries" && <span>3</span>}
            </button>
          ))}
        </nav>
        <div className="admin-help">
          <div>
            <TrendUp />
          </div>
          <strong>Grow your visibility</strong>
          <p>
            Keep your listing complete and respond quickly to new inquiries.
          </p>
          <button onClick={() => go(`/listing/${listing.id}`)}>
            View public listing
          </button>
        </div>
        <button className="signout" onClick={onLogout}>
          <SignOut /> Sign out
        </button>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <button className="admin-menu" onClick={() => setMobileSide(true)}>
            <List />
          </button>
          <div>
            <p>Business workspace</p>
            <h1>{section}</h1>
          </div>
          <div className="admin-actions">
            <ThemeToggle />
            <button className="icon-button">
              <Bell />
              <i />
            </button>
            <div className="admin-user">ID</div>
            <div className="admin-user-copy">
              <strong>Ina de la Cruz</strong>
              <span>Business Owner</span>
            </div>
          </div>
        </header>
        {section === "Overview" ? (
          <div className="admin-content">
            <section className="welcome-row">
              <div>
                <h2>Welcome back, Ina.</h2>
                <p>Your listing is live and reaching more potential clients.</p>
              </div>
              <button
                className="admin-primary"
                onClick={() => setSection("My Listing")}
              >
                <PencilSimple /> Edit listing
              </button>
            </section>
            <section className="metric-grid">
              <article>
                <div className="metric-icon green">
                  <Eye />
                </div>
                <div className="metric-copy">
                  <p>Listing views</p>
                  <h3>1,248</h3>
                  <span className="positive">
                    <TrendUp />
                    +18.2%
                  </span>
                </div>
              </article>
              <article>
                <div className="metric-icon blue">
                  <ChatCircleText />
                </div>
                <div className="metric-copy">
                  <p>New inquiries</p>
                  <h3>12</h3>
                  <span className="positive">3 unread</span>
                </div>
              </article>
              <article>
                <div className="metric-icon violet">
                  <Heart />
                </div>
                <div className="metric-copy">
                  <p>Saved by users</p>
                  <h3>47</h3>
                  <span className="positive">
                    <TrendUp />
                    +8 this week
                  </span>
                </div>
              </article>
              <article>
                <div className="metric-icon amber">
                  <ChartLineUp />
                </div>
                <div className="metric-copy">
                  <p>Profile strength</p>
                  <h3>92%</h3>
                  <span className="attention">Add business hours</span>
                </div>
              </article>
            </section>
            <div className="dashboard-grid">
              <section className="panel user-listing-card">
                <img src={listing.image} alt="" />
                <div>
                  <StatusPill status={listing.status} />
                  <h3>{listing.name}</h3>
                  <p>
                    <MapPin weight="fill" /> {listing.location}, Philippines
                  </p>
                  <div className="listing-health">
                    <span>
                      <CheckCircle weight="fill" /> Contact details
                    </span>
                    <span>
                      <CheckCircle weight="fill" /> Services
                    </span>
                    <span>
                      <WarningCircle weight="fill" /> Business hours
                    </span>
                  </div>
                  <button
                    className="admin-primary"
                    onClick={() => go(`/listing/${listing.id}`)}
                  >
                    <Eye /> View public listing
                  </button>
                </div>
              </section>
              <section className="panel review-panel">
                <div className="panel-head">
                  <div>
                    <h3>Recent inquiries</h3>
                    <p>Your latest customer messages</p>
                  </div>
                  <button onClick={() => setSection("Inquiries")}>
                    View all <ArrowRight />
                  </button>
                </div>
                {[
                  "Wedding coordination package",
                  "October corporate event",
                  "Venue and supplier sourcing",
                ].map((x, i) => (
                  <button className="review-item inquiry-row" key={x}>
                    <div className="inquiry-avatar">
                      {["MC", "JL", "AP"][i]}
                    </div>
                    <span>
                      <strong>{x}</strong>
                      <small>
                        {i + 1} day{i ? "s" : ""} ago
                      </small>
                    </span>
                    <ArrowRight />
                  </button>
                ))}
              </section>
            </div>
          </div>
        ) : section === "My Listing" ? (
          <div className="admin-content">
            <section className="welcome-row">
              <div>
                <h2>My business listing</h2>
                <p>Update how Events by Ina appears across Findra.</p>
              </div>
              <button className="admin-primary" onClick={() => setSaved(true)}>
                <Check /> Save changes
              </button>
            </section>
            {saved && (
              <div className="inline-success">
                <CheckCircle weight="fill" /> Your listing changes were saved.
              </div>
            )}
            <section className="panel user-editor">
              <div className="editor-cover">
                <img src={listing.image} alt="" />
                <button>
                  <UploadSimple /> Replace cover
                </button>
              </div>
              <div className="editor-form">
                <label>
                  Business name
                  <input defaultValue={listing.name} />
                </label>
                <label>
                  Tagline
                  <input defaultValue={listing.tagline} />
                </label>
                <label>
                  Category
                  <select defaultValue={listing.category}>
                    <option>{listing.category}</option>
                    <option>Professionals</option>
                  </select>
                </label>
                <label>
                  Location
                  <input defaultValue={`${listing.location}, Philippines`} />
                </label>
                <label className="wide">
                  Business description
                  <textarea
                    rows="5"
                    defaultValue="We create meaningful, beautifully coordinated events—from intimate gatherings to milestone celebrations."
                  />
                </label>
              </div>
            </section>
          </div>
        ) : (
          <AdminSection
            section={
              section === "Analytics"
                ? "Inquiries"
                : section === "Profile"
                  ? "Users"
                  : "Inquiries"
            }
          />
        )}
      </main>
    </div>
  );
}

function UserDashboardLegacyTwo({ go, listing, onSave, onLogout }) {
  const [section, setSection] = useState("Overview");
  const [mobileSide, setMobileSide] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const current = listing || {
    ...blankListing,
    owner: "Ina de la Cruz",
    name: "Events by Ina",
  };
  const save = (record) => {
    const result = onSave(record);
    if (result === false) return;
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2600);
  };
  return (
    <div className="admin-shell user-dashboard">
      <aside className={`admin-sidebar ${mobileSide ? "open" : ""}`}>
        <div className="admin-brand">
          <BrandLogo />
          <span>BUSINESS</span>
          <button onClick={() => setMobileSide(false)}>
            <X />
          </button>
        </div>
        <nav>
          {userSideItems.map(([name, Icon]) => (
            <button
              className={section === name ? "active" : ""}
              key={name}
              onClick={() => {
                setSection(name);
                setMobileSide(false);
              }}
            >
              <Icon />
              {name}
              {name === "Inquiries" && <span>3</span>}
            </button>
          ))}
        </nav>
        <div className="admin-help">
          <div>
            <TrendUp />
          </div>
          <strong>Grow your visibility</strong>
          <p>
            Keep your listing complete and respond quickly to new inquiries.
          </p>
          {listing && (
            <button onClick={() => go(`/listing/${listing.id}`)}>
              View public listing
            </button>
          )}
        </div>
        <button className="signout" onClick={onLogout}>
          <SignOut /> Sign out
        </button>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <button className="admin-menu" onClick={() => setMobileSide(true)}>
            <List />
          </button>
          <div>
            <p>Business workspace</p>
            <h1>{section}</h1>
          </div>
          <div className="admin-actions">
            <ThemeToggle />
            <button className="icon-button">
              <Bell />
              <i />
            </button>
            <div className="admin-user">ID</div>
            <div className="admin-user-copy">
              <strong>Ina de la Cruz</strong>
              <span>Business Owner</span>
            </div>
          </div>
        </header>
        {saved && (
          <div className="toast">
            <CheckCircle weight="fill" />
            Listing changes saved
          </div>
        )}
        {section === "Overview" ? (
          <div className="admin-content">
            <section className="welcome-row">
              <div>
                <h2>Welcome back, Ina.</h2>
                <p>Manage your business and keep its Findra profile current.</p>
              </div>
              <button
                className="admin-primary"
                onClick={() => {
                  setSection("My Listing");
                  setEditing(true);
                }}
              >
                <PencilSimple /> {listing ? "Edit listing" : "Create listing"}
              </button>
            </section>
            <section className="metric-grid">
              <article>
                <div className="metric-icon green">
                  <Eye />
                </div>
                <div className="metric-copy">
                  <p>Listing views</p>
                  <h3>{listing?.views || 0}</h3>
                  <span className="positive">
                    <TrendUp />
                    +18.2%
                  </span>
                </div>
              </article>
              <article>
                <div className="metric-icon blue">
                  <ChatCircleText />
                </div>
                <div className="metric-copy">
                  <p>New inquiries</p>
                  <h3>12</h3>
                  <span className="positive">3 unread</span>
                </div>
              </article>
              <article>
                <div className="metric-icon violet">
                  <Heart />
                </div>
                <div className="metric-copy">
                  <p>Saved by users</p>
                  <h3>47</h3>
                  <span className="positive">+8 this week</span>
                </div>
              </article>
              <article>
                <div className="metric-icon amber">
                  <ChartLineUp />
                </div>
                <div className="metric-copy">
                  <p>Profile strength</p>
                  <h3>{listing ? "92%" : "0%"}</h3>
                  <span className="attention">Keep details current</span>
                </div>
              </article>
            </section>
            {listing ? (
              <section className="panel user-listing-card">
                <img src={listing.image} alt="" />
                <div>
                  <StatusPill status={listing.status} />
                  <h3>{listing.name}</h3>
                  <p>
                    <MapPin weight="fill" /> {listing.location}, Philippines
                  </p>
                  <div className="listing-health">
                    <span>
                      <CheckCircle weight="fill" /> Contact details
                    </span>
                    <span>
                      <CheckCircle weight="fill" /> Services
                    </span>
                    <span>
                      <WarningCircle weight="fill" /> Business hours
                    </span>
                  </div>
                  <button
                    className="admin-primary"
                    onClick={() => go(`/listing/${listing.id}`)}
                  >
                    <Eye /> View public listing
                  </button>
                </div>
              </section>
            ) : (
              <section className="panel admin-empty">
                <Storefront size={42} />
                <h3>Create your first listing</h3>
                <p>Add your business details to start getting discovered.</p>
                <button
                  className="admin-primary"
                  onClick={() => setEditing(true)}
                >
                  <Plus /> Create listing
                </button>
              </section>
            )}
          </div>
        ) : section === "My Listing" ? (
          <div className="admin-content">
            <section className="welcome-row">
              <div>
                <h2>My business listing</h2>
                <p>
                  Review and update how your business appears across Findra.
                </p>
              </div>
              <button
                className="admin-primary"
                onClick={() => setEditing(true)}
              >
                <PencilSimple /> {listing ? "Edit details" : "Create listing"}
              </button>
            </section>
            {listing ? (
              <section className="panel user-listing-card">
                <img src={listing.image} alt="" />
                <div>
                  <StatusPill status={listing.status} />
                  <h3>{listing.name}</h3>
                  <p>{listing.tagline}</p>
                  <p>
                    <MapPin weight="fill" /> {listing.location}, Philippines
                  </p>
                  <div className="service-tags">
                    {listing.services.map((service) => (
                      <span key={service}>{service}</span>
                    ))}
                  </div>
                </div>
              </section>
            ) : (
              <section className="panel admin-empty">
                <Storefront size={42} />
                <h3>No listing yet</h3>
                <p>Create one to appear in the Findra business directory.</p>
              </section>
            )}
          </div>
        ) : (
          <AdminSection
            section={
              section === "Analytics"
                ? "Inquiries"
                : section === "Profile"
                  ? "Users"
                  : "Inquiries"
            }
          />
        )}
      </main>
      {editing && (
        <ListingEditor
          item={listing || current}
          close={() => setEditing(false)}
          save={save}
        />
      )}
    </div>
  );
}

function UserDashboard({ go, listing, onSave, onLogout, session }) {
  const [section, setSection] = usePersistedDashboardSection("findra-user-section", "Overview");
  const [mobileSide, setMobileSide] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const displayName = session?.name || "Business Owner";
  const firstName = displayName.split(" ")[0];
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const current = listing || { ...blankListing, owner: displayName };
  const pendingPayment = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("findra-paymongo-pending"));
    } catch {
      return null;
    }
  }, []);
  const openListingFlow = () => {
    if (listing) {
      setEditing(true);
      return;
    }
    // New listings must use the package checkout journey. Editing an existing
    // listing remains available directly from the business dashboard.
    go("/add-listing");
  };
  const save = (record) => {
    const result = onSave(record);
    if (result === false) return;
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2600);
  };

  return (
    <div className="admin-shell user-dashboard">
      <aside className={`admin-sidebar ${mobileSide ? "open" : ""}`}>
        <div className="admin-brand">
          <BrandLogo />
          <span>BUSINESS</span>
          <button aria-label="Close menu" onClick={() => setMobileSide(false)}>
            <X />
          </button>
        </div>
        <button className="site-return" onClick={() => go("/")}>
          <ArrowLeft /> Back to main site
        </button>
        <nav>
          {userSideItems.map(([name, Icon]) => (
            <button
              className={section === name ? "active" : ""}
              key={name}
              onClick={() => {
                setSection(name);
                setMobileSide(false);
              }}
            >
              <Icon />
              {name}
              {name === "Inquiries" && <span>3</span>}
            </button>
          ))}
        </nav>
        <div className="admin-help">
          <div>
            <TrendUp />
          </div>
          <strong>Grow your visibility</strong>
          <p>
            Keep your listing complete and respond quickly to new inquiries.
          </p>
          {listing && (
            <button onClick={() => go(`/listing/${listing.id}`)}>
              View public listing
            </button>
          )}
        </div>
        <button className="signout" onClick={onLogout}>
          <SignOut /> Sign out
        </button>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <button
            className="admin-menu"
            aria-label="Open menu"
            onClick={() => setMobileSide(true)}
          >
            <List />
          </button>
          <div>
            <p>Business workspace</p>
            <h1>{section}</h1>
          </div>
          <div className="admin-actions">
            <button className="topbar-site-link" onClick={() => go("/")}>
              <House /> Main site
            </button>
            <ThemeToggle />
            <NotificationInbox />
            <div className="admin-user">{initials}</div>
            <div className="admin-user-copy">
              <strong>{displayName}</strong>
              <span>Business Owner</span>
            </div>
          </div>
        </header>
        {saved && (
          <div className="toast" role="status">
            <CheckCircle weight="fill" />
            Listing changes saved
          </div>
        )}
        {pendingPayment && (
          <section className="admin-content">
            <div className="panel billing-card">
              <div className="billing-icon"><CreditCard /></div>
              <div>
                <span>PAYMENT NOT FINISHED</span>
                <h3>Finish checkout for {pendingPayment.draft?.name || "your listing"}</h3>
                <p>Your business details and uploaded media are safe. Complete payment to submit the listing for review.</p>
              </div>
              <button className="admin-primary" onClick={() => go("/add-listing")}>Continue payment <ArrowRight /></button>
            </div>
          </section>
        )}
        {section === "Overview" ? (
          <div className="admin-content">
            <section className="welcome-row">
              <div>
                <h2>Welcome back, {firstName}.</h2>
                <p>Manage your business and keep its Findra profile current.</p>
              </div>
              <button
                className="admin-primary"
                onClick={() => {
                  setSection("My Listing");
                  openListingFlow();
                }}
              >
                <PencilSimple /> {listing ? "Edit listing" : "Create listing"}
              </button>
            </section>
            <section className="metric-grid">
              {[
                ["Listing views", listing?.views || 0, "+18.2%", Eye, "green"],
                ["New inquiries", 12, "3 unread", ChatCircleText, "blue"],
                ["Saved by users", 47, "+8 this week", Heart, "violet"],
                [
                  "Profile strength",
                  listing ? "92%" : "0%",
                  "Keep details current",
                  ChartLineUp,
                  "amber",
                ],
              ].map(([label, value, note, Icon, tone], index) => (
                <article style={{ "--stagger": `${index * 45}ms` }} key={label}>
                  <div className={`metric-icon ${tone}`}>
                    <Icon />
                  </div>
                  <div className="metric-copy">
                    <p>{label}</p>
                    <h3>{value}</h3>
                    <span
                      className={tone === "amber" ? "attention" : "positive"}
                    >
                      {tone !== "amber" && <TrendUp />}
                      {note}
                    </span>
                  </div>
                </article>
              ))}
            </section>
            {listing ? (
              <section className="panel user-listing-card">
                <img src={listing.image} alt="" />
                <div>
                  <StatusPill status={listing.status} />
                  <h3>{listing.name}</h3>
                  <p>
                    <MapPin weight="fill" /> {listing.location}, Philippines
                  </p>
                  <div className="listing-health">
                    <span>
                      <CheckCircle weight="fill" /> Contact details
                    </span>
                    <span>
                      <CheckCircle weight="fill" /> Services
                    </span>
                    <span>
                      <WarningCircle weight="fill" /> Business hours
                    </span>
                  </div>
                  <button
                    className="admin-primary"
                    onClick={() => go(`/listing/${listing.id}`)}
                  >
                    <Eye /> View public listing
                  </button>
                </div>
              </section>
            ) : (
              <section className="panel admin-empty">
                <Storefront size={42} />
                <h3>Create your first listing</h3>
                <p>Add your business details to start getting discovered.</p>
                <button
                  className="admin-primary"
                  onClick={openListingFlow}
                >
                  <Plus /> Create listing
                </button>
              </section>
            )}
          </div>
        ) : section === "My Listing" ? (
          <div className="admin-content">
            <section className="welcome-row">
              <div>
                <h2>My business listing</h2>
                <p>
                  Review and update how your business appears across Findra.
                </p>
              </div>
              <button
                className="admin-primary"
                onClick={openListingFlow}
              >
                <PencilSimple /> {listing ? "Edit details" : "Create listing"}
              </button>
            </section>
            {listing ? (
              <section className="panel user-listing-card">
                <img src={listing.image} alt="" />
                <div>
                  <StatusPill status={listing.status} />
                  <h3>{listing.name}</h3>
                  <p>{listing.tagline}</p>
                  <p>
                    <MapPin weight="fill" /> {listing.location}, Philippines
                  </p>
                  <div className="service-tags">
                    {listing.services.map((service) => (
                      <span key={service}>{service}</span>
                    ))}
                  </div>
                </div>
              </section>
            ) : (
              <section className="panel admin-empty">
                <Storefront size={42} />
                <h3>No listing yet</h3>
                <p>Create one to appear in the Findra business directory.</p>
              </section>
            )}
          </div>
        ) : section === "Plan & Billing" ? (
          <PlanBilling listing={listing} resumePayment={pendingPayment ? () => go("/add-listing") : null} />
        ) : section === "Inbox" ? (
          <UserInbox />
        ) : section === "Inquiries" ? (
          <UserInquiries listing={listing} />
        ) : section === "Analytics" ? (
          <UserAnalytics listing={listing} />
        ) : (
          <UserAccountProfile session={session} listing={listing} onEdit={openListingFlow} onSaveListing={onSave} />
        )}
      </main>
      {editing && (
        <ListingEditor
          item={listing || current}
          close={() => setEditing(false)}
          save={save}
        />
      )}
    </div>
  );
}

function PlanBilling({ listing, resumePayment }) {
  const subscription = listing?.subscription;
  return (
    <div className="admin-content">
      <section className="welcome-row">
        <div>
          <h2>Plan & billing</h2>
          <p>Review your Findra subscription and PayMongo payment details.</p>
        </div>
        {subscription && <StatusPill status={subscription.status} />}
      </section>
      <section className="panel billing-card">
        {subscription ? (
          <>
            <div className="billing-icon">
              <CreditCard />
            </div>
            <div>
              <span>CURRENT PLAN</span>
              <h3>{subscription.plan}</h3>
              <p>
                ₱{Number(subscription.amount).toLocaleString()} per{" "}
                {subscription.billing}
              </p>
            </div>
            <dl>
              <div>
                <dt>Payment method</dt>
                <dd>
                  {String(subscription.paymentMethod).replaceAll("_", " ")}
                </dd>
              </div>
              <div>
                <dt>PayMongo reference</dt>
                <dd>{subscription.paymentReference}</dd>
              </div>
              <div>
                <dt>Listing status</dt>
                <dd>{listing.status}</dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <div className="billing-icon">
              <CreditCard />
            </div>
            <div>
              <span>NO ACTIVE PLAN</span>
              <h3>Finish your listing checkout</h3>
              <p>
                Your subscription details will appear here after a successful
                PayMongo payment.
              </p>
            </div>
            {resumePayment && <button className="admin-primary" onClick={resumePayment}>Continue payment <ArrowRight /></button>}
          </>
        )}
      </section>
    </div>
  );
}

function UserInquiries({ listing }) {
  return <div className="admin-content">
    <section className="welcome-row"><div><h2>Customer inquiries</h2><p>Messages sent through your public business profile will appear here.</p></div></section>
    <section className="panel admin-empty"><ChatCircleText size={42} /><h3>No inquiries yet</h3><p>{listing ? "Publish and share your listing to start receiving customer messages." : "Create and complete a paid listing to receive customer inquiries."}</p></section>
  </div>;
}

function UserInbox() {
  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState([]);
  const [form, setForm] = useState({ subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);
  const load = async () => {
    const [notificationsResponse, messagesResponse] = await Promise.all([fetch("/api/notifications", { credentials: "same-origin" }), fetch("/api/inbox/messages", { credentials: "same-origin" })]);
    const notificationsPayload = await notificationsResponse.json().catch(() => ({}));
    const messagesPayload = await messagesResponse.json().catch(() => ({}));
    if (notificationsResponse.ok) setNotifications(notificationsPayload.notifications || []);
    if (messagesResponse.ok) setMessages(messagesPayload.messages || []);
  };
  useEffect(() => { load().catch(() => {}); }, []);
  const send = async (event) => {
    event.preventDefault(); setSending(true); setStatus(null);
    try {
      const response = await fetch("/api/inbox/messages", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Message could not be sent.");
      setMessages((current) => [payload.message, ...current]); setForm({ subject: "", message: "" }); setStatus({ type: "success", message: "Your message was sent to the Findra admin team." });
    } catch (error) { setStatus({ type: "error", message: error.message }); } finally { setSending(false); }
  };
  return <div className="admin-content inbox-workspace"><section className="welcome-row"><div><span className="section-eyebrow">Account communications</span><h2>Inbox</h2><p>Review all Findra activity and send a message directly to the admin team.</p></div><button className="secondary-button" onClick={() => load()}>Refresh inbox</button></section><div className="inbox-layout"><section className="panel inbox-notifications"><header><h3>Notifications</h3><span>{notifications.length}</span></header>{notifications.length ? notifications.map((item) => <article key={item.id}><CheckCircle weight="fill" /><div><strong>{item.title}</strong><p>{item.body}</p><small>{new Date(item.created_at).toLocaleString()}</small></div></article>) : <p className="muted-copy">No notifications yet.</p>}</section><section className="panel inbox-compose"><span className="section-eyebrow">Message Findra</span><h3>Contact the admin team</h3><p>Use this for account, billing, listing, or platform support. The team receives an email notification.</p><form onSubmit={send}><label><span>Subject *</span><input required value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} placeholder="How can Findra help?" /></label><label><span>Message *</span><textarea required value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} placeholder="Write your message to the Findra admin team…" /></label><button className="admin-primary" disabled={sending} type="submit"><EnvelopeSimple />{sending ? "Sending…" : "Send message"}</button></form>{status && <p className={`inbox-send-status ${status.type}`}>{status.message}</p>}<div className="sent-message-list"><h4>Your sent messages</h4>{messages.length ? messages.map((item) => <article key={item.id}><strong>{item.subject}</strong><p>{item.message}</p><small>{new Date(item.created_at).toLocaleString()}</small></article>) : <p className="muted-copy">No messages sent yet.</p>}</div></section></div></div>;
}

function UserAnalytics({ listing }) {
  const views = listing?.views || 0;
  return <div className="admin-content">
    <section className="welcome-row"><div><h2>Listing performance</h2><p>A clear view of how customers discover and engage with your business.</p></div></section>
    <section className="metric-grid simple">
      {[["Profile views", views, Eye, "green"], ["Inquiry rate", listing ? "—" : "0%", ChatCircleText, "blue"], ["Profile completeness", listing ? "92%" : "0%", ChartLineUp, "violet"]].map(([label, value, Icon, tone]) => <article key={label}><div className={`metric-icon ${tone}`}><Icon /></div><div className="metric-copy"><p>{label}</p><h3>{value}</h3><span className="positive">Updates as customers interact</span></div></article>)}
    </section>
  </div>;
}

function UserAccountProfile({ session, listing, onEdit, onSaveListing }) {
  const [form, setForm] = useState({ name: session?.name || "", profileImage: session?.profileImage || "", website: listing?.website || "", facebook: listing?.facebook || "", instagram: listing?.instagram || "", linkedin: listing?.linkedin || "", whatsapp: listing?.whatsapp || "", viber: listing?.viber || "" });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const uploadAvatar = async (file) => {
    if (!file) return;
    setSaving(true); setStatus(null);
    try {
      const response = await fetch("/api/media/upload", { method: "POST", credentials: "same-origin", headers: { "Content-Type": file.type || "application/octet-stream", "X-File-Name": encodeURIComponent(file.name) }, body: file });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Profile photo could not be uploaded.");
      setField("profileImage", payload.url); setStatus({ type: "success", message: "Photo uploaded. Save profile to apply it." });
    } catch (error) { setStatus({ type: "error", message: error.message }); } finally { setSaving(false); }
  };
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setStatus(null);
    try {
      const response = await fetch("/api/auth/profile", { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, profileImage: form.profileImage }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Account profile could not be saved.");
      if (listing && onSaveListing({ ...listing, website: form.website, facebook: form.facebook, instagram: form.instagram, linkedin: form.linkedin, whatsapp: form.whatsapp, viber: form.viber }) === false) throw new Error("Social links could not be saved.");
      localStorage.setItem("findra-session", JSON.stringify({ ...session, ...sessionFromUser(payload.user) }));
      window.dispatchEvent(new CustomEvent("findra-session-change", { detail: sessionFromUser(payload.user) }));
      setStatus({ type: "success", message: "Account profile and contact channels saved." });
    } catch (error) { setStatus({ type: "error", message: error.message }); } finally { setSaving(false); }
  };
  const socialFields = [["website", "Business website", "https://yourbusiness.com"], ["facebook", "Facebook page", "https://facebook.com/yourbusiness"], ["instagram", "Instagram profile", "https://instagram.com/yourbusiness"], ["linkedin", "LinkedIn page", "https://linkedin.com/company/yourbusiness"], ["whatsapp", "WhatsApp number", "+63 917 123 4567"], ["viber", "Viber number", "+63 917 123 4567"]];
  return <div className="admin-content account-profile-page">
    <section className="welcome-row"><div><span className="section-eyebrow">Personal settings</span><h2>Account & profile</h2><p>Choose how you appear on Findra and keep the contact links on your public listing up to date.</p></div><button className="secondary-button" onClick={onEdit}><PencilSimple /> Edit business details</button></section>
    <form className="account-profile-form" onSubmit={save}>
      <section className="panel profile-hero-card"><AccountAvatar session={{ ...session, profileImage: form.profileImage || session?.profileImage }} businessLogo={listing?.logo} className="profile-avatar-large" /><div><span className="section-eyebrow">Account photo</span><h3>{form.name || "Business owner"}</h3><p>{form.profileImage ? "Custom profile photo" : listing?.logo ? "Using your business logo as your account photo" : "Using your Findra initials until you add a photo"}</p></div><label className="secondary-button upload-avatar-button"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadAvatar(event.target.files?.[0])} />Upload photo</label></section>
      <section className="panel profile-settings-card"><h3>Account details</h3><p>Your name is used across your dashboard and account communications.</p><div className="profile-form-grid"><label><span>Display name *</span><input required value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="Your name" /></label><label><span>Email address</span><input value={session?.email || ""} disabled /></label></div></section>
      <section className="panel profile-settings-card"><h3>Social & contact links</h3><p>These are synced with your business listing, so customers can reach you from the public profile.</p><div className="profile-form-grid social-links-grid">{socialFields.map(([field, label, placeholder]) => <label key={field}><span>{label}</span><input value={form[field]} onChange={(event) => setField(field, event.target.value)} placeholder={placeholder} /></label>)}</div></section>
      {status && <p className={`profile-save-status ${status.type}`}>{status.message}</p>}
      <div className="profile-save-bar"><span>Changes to social links appear on your business listing.</span><button className="admin-primary" disabled={saving} type="submit"><CheckCircle />{saving ? "Saving…" : "Save profile"}</button></div>
    </form>
  </div>;
}

function UserAccountProfileLegacy({ session, listing, onEdit }) {
  const channels = [
    ["Website", listing?.website], ["Facebook", listing?.facebook], ["Instagram", listing?.instagram], ["LinkedIn", listing?.linkedin], ["WhatsApp", listing?.whatsapp], ["Viber", listing?.viber],
  ].filter(([, value]) => value);
  return <div className="admin-content">
    <section className="welcome-row"><div><h2>Account & profile</h2><p>Keep your account and the customer contact channels on your public profile current.</p></div><button className="admin-primary" onClick={onEdit}><PencilSimple /> Edit business profile</button></section>
    <section className="panel"><h3>Account owner</h3><div className="account-detail-grid"><article><small>NAME</small><strong>{session?.name || "Business owner"}</strong></article><article><small>EMAIL</small><strong>{session?.email || "—"}</strong></article><article><small>ACCOUNT ROLE</small><strong>Business Owner</strong></article></div></section>
    <section className="panel"><h3>Public contact channels</h3>{channels.length ? <div className="account-detail-grid">{channels.map(([label, value]) => <article key={label}><small>{label.toUpperCase()}</small><strong>{value}</strong></article>)}</div> : <p>Add a website, social profile, and a preferred chat channel to make it easier for customers to reach you.</p>}</section>
  </div>;
}

function AdminSection({ section }) {
  const cards = {
    Users: [
      ["Total members", "184"],
      ["Business owners", "71"],
      ["New this month", "18"],
    ],
    Inquiries: [
      ["Open inquiries", "42"],
      ["Answered", "284"],
      ["Avg. response", "4.2h"],
    ],
    Subscriptions: [
      ["Active plans", "68"],
      ["Monthly revenue", "₱102k"],
      ["Failed payments", "3"],
    ],
    Categories: [
      ["Main categories", "5"],
      ["Services", "63"],
      ["Unassigned", "2"],
    ],
    "Pages & Content": [
      ["Published pages", "12"],
      ["Draft updates", "4"],
      ["Legal reviews", "1"],
    ],
    Settings: [
      ["Email delivery", "Healthy"],
      ["Admin users", "3"],
      ["Integrations", "6"],
    ],
  };
  return (
    <div className="admin-content">
      <section className="welcome-row">
        <div>
          <h2>{section}</h2>
          <p>Manage Findra’s {section.toLowerCase()} from this workspace.</p>
        </div>
        <button className="admin-primary">
          <Plus /> Create new
        </button>
      </section>
      <section className="metric-grid simple">
        {cards[section].map(([a, b], i) => (
          <article key={a}>
            <div className={`metric-icon ${["green", "blue", "violet"][i]}`}>
              <SquaresFour />
            </div>
            <div className="metric-copy">
              <p>{a}</p>
              <h3>{b}</h3>
              <span className="positive">Up to date</span>
            </div>
          </article>
        ))}
      </section>
      <section className="panel placeholder-panel">
        <div className="placeholder-icon">
          <Gear />
        </div>
        <h3>{section} workspace</h3>
        <p>
          This prototype includes the complete information architecture and
          visual system. Connect your preferred backend to make these records
          persistent.
        </p>
        <button className="admin-primary">Configure {section}</button>
      </section>
    </div>
  );
}

function SettingsAdmin({ onNotify }) {
  const [tab, setTab] = useState("account");
  const setTheme = (theme) => {
    localStorage.setItem("findra-theme", theme);
    document.documentElement.dataset.theme = theme;
    onNotify?.({ type: "success", title: "Appearance updated", message: `${theme === "dark" ? "Dark" : "Light"} mode is now the default appearance for this browser.` });
  };
  return <div className="admin-content settings-workspace">
    <section className="welcome-row"><div><span className="section-eyebrow">Workspace controls</span><h2>Settings</h2><p>Manage administrator preferences, appearance, and connected platform services.</p></div></section>
    <nav className="settings-tabs" aria-label="Settings sections">
      {["account", "appearance", "integrations"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item === "account" ? "Account" : item === "appearance" ? "Appearance" : "Integrations"}</button>)}
    </nav>
    {tab === "account" && <section className="settings-card-grid"><article className="panel"><span className="section-eyebrow">Administrator account</span><h3>Workspace ownership</h3><p>Account access, password recovery, and administrator permissions are managed through secure Findra sessions.</p><div className="account-detail-grid"><article><small>ACCESS</small><strong>Administrator</strong></article><article><small>SESSION</small><strong>Secure cookie</strong></article></div></article><article className="panel"><span className="section-eyebrow">Security</span><h3>Recommended controls</h3><p>Use a unique password, enable two-factor authentication on Render, Brevo, Cloudflare, and PayMongo, and restrict credentials to the correct environment.</p></article></section>}
    {tab === "appearance" && <section className="settings-card-grid"><article className="panel"><span className="section-eyebrow">Interface preference</span><h3>Appearance</h3><p>Choose the visual mode that best suits your working environment. Each user keeps this choice in their own browser.</p><div className="appearance-choice-row"><button className="secondary-button" onClick={() => setTheme("light")}>Light mode</button><button className="admin-primary" onClick={() => setTheme("dark")}>Dark mode</button></div></article><article className="panel"><span className="section-eyebrow">Accessibility</span><h3>Readable by default</h3><p>Findra uses high-contrast text, visible keyboard focus, and clear status colors across administration and business-owner dashboards.</p></article></section>}
    {tab === "integrations" && <IntegrationsAdmin onNotify={onNotify} embedded />}
  </div>;
}

function IntegrationsAdmin({ onNotify, embedded = false }) {
  const [integration, setIntegration] = useState({
    configured: false,
    connectedAt: "",
    enabled: false,
    keyHint: "",
    loading: true,
    mode: "not configured",
    paymentMethods: [],
    source: "not configured",
  });
  const [busy, setBusy] = useState("");
  const [inlineError, setInlineError] = useState("");

  const applyResponse = async (response) => {
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(result.error || "The PayMongo request failed.");
    setIntegration({ ...result, loading: false });
    return result;
  };

  const refreshStatus = async () => {
    setBusy("refresh");
    setInlineError("");
    try {
      await applyResponse(await fetch("/api/paymongo/integration"));
    } catch (error) {
      setIntegration((current) => ({ ...current, loading: false }));
      setInlineError(error.message);
    } finally {
      setBusy("");
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const toggleIntegration = async () => {
    if (!integration.configured) {
      setInlineError(
        "Connect and verify a secret key before enabling checkout.",
      );
      return;
    }
    const enabled = !integration.enabled;
    setBusy("toggle");
    setInlineError("");
    try {
      await applyResponse(
        await fetch("/api/paymongo/integration", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        }),
      );
      onNotify?.({
        type: "success",
        title: enabled ? "PayMongo enabled" : "PayMongo disabled",
        message: enabled
          ? "Customers can now continue to PayMongo checkout."
          : "New PayMongo checkout sessions are paused.",
      });
    } catch (error) {
      setInlineError(error.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <div className={embedded ? "integrations-admin embedded" : "admin-content integrations-admin"}>
      {!embedded && <section className="welcome-row integrations-welcome">
        <div>
          <span className="section-eyebrow">Payments &amp; checkout</span>
          <h2>Integrations</h2>
          <p>
            Connect payment and communications services, verify credentials, and
            control which tools are active.
          </p>
        </div>
        <div className="integration-status-pill provider-count">
          <i />2 service providers
        </div>
      </section>}

      <section className="integration-overview-grid">
        <article className="panel paymongo-integration-card">
          <header>
            <div className="integration-provider-icon">
              <CreditCard weight="duotone" />
            </div>
            <div>
              <span>PAYMENT GATEWAY</span>
              <h3>PayMongo</h3>
              <p>Cards, GCash, Maya, GrabPay, and other enabled methods.</p>
            </div>
            <button
              type="button"
              className={`integration-switch ${integration.enabled ? "on" : ""}`}
              aria-pressed={integration.enabled}
              aria-label={
                integration.enabled
                  ? "Disable PayMongo checkout"
                  : "Enable PayMongo checkout"
              }
              disabled={busy === "toggle" || integration.loading}
              onClick={toggleIntegration}
            >
              <i />
            </button>
          </header>

          <div className="integration-summary">
            <div>
              <span>Environment</span>
              <strong>{integration.mode}</strong>
            </div>
            <div>
              <span>Secret key</span>
              <strong>{integration.keyHint || "Not connected"}</strong>
            </div>
            <div>
              <span>Configuration source</span>
              <strong>{integration.source}</strong>
            </div>
          </div>

          <div className="integration-methods">
            <span>Verified payment methods</span>
            <div>
              {integration.paymentMethods.length ? (
                integration.paymentMethods.map((method) => (
                  <b key={method}>{method.replaceAll("_", " ")}</b>
                ))
              ) : (
                <small>
                  Connect a key to load the methods enabled for your merchant
                  account.
                </small>
              )}
            </div>
          </div>

          <footer>
            <button
              type="button"
              className="secondary-button"
              disabled={busy === "refresh"}
              onClick={refreshStatus}
            >
              {busy === "refresh" ? "Refreshing…" : "Refresh status"}
            </button>
            <a
              className="admin-primary"
              href="https://dashboard.paymongo.com/developers"
              target="_blank"
              rel="noreferrer"
            >
              Open PayMongo dashboard <ArrowRight />
            </a>
          </footer>
        </article>

        <form className="panel integration-connect-card" onSubmit={(event) => { event.preventDefault(); setInlineError("PayMongo credentials are managed in Render. Change PAYMONGO_MODE, save, rebuild, and deploy."); }}>
          <div className="integration-card-title">
            <div>
              <Plug weight="duotone" />
            </div>
            <span>
              <small>SECURE CONNECTION</small>
              <strong>PayMongo environment</strong>
            </span>
          </div>
          <label>
            <FieldLabel>Server-managed payment key</FieldLabel>
            <input
              disabled
              type="text"
              placeholder="sk_test_••••••••••••••••"
            />
            <small>Set both secret keys in Render. Set PAYMONGO_MODE=test for sandbox checkout or PAYMONGO_MODE=live for real payments, then redeploy.</small>
          </label>
          <div className="integration-enable-option">
            <span>
              <strong>{integration.mode === "test" ? "Test mode is active" : integration.mode === "live" ? "Live mode is active" : "Payment keys are not configured"}</strong>
              <small>{integration.mode === "test" ? "Use a PayMongo test payment method to verify checkout and email delivery without a real charge." : "The active environment is selected securely through Render."}</small>
            </span>
          </div>
          {inlineError && (
            <div className="integration-inline-error" role="alert">
              <WarningCircle weight="fill" /> {inlineError}
            </div>
          )}
          <button
            className="admin-primary integration-connect-button"
            disabled
            type="submit"
          >
            {busy === "connect"
              ? "Verifying with PayMongo…"
              : "Connect & verify"}
            <ArrowRight />
          </button>
          <div className="integration-security-note">
            <ShieldCheck weight="fill" />
            <p>
              <strong>Your secret key stays on the server.</strong>
              The browser only receives its mode and a masked hint. Keys added
              here remain active for the current server process; configure
              PAYMONGO_SECRET_KEY on your host for restart persistence.
            </p>
          </div>
        </form>
      </section>
      <BrevoIntegration onNotify={onNotify} />
      <GoogleMapsIntegration />
    </div>
  );
}

function GoogleMapsIntegration() {
  const [status, setStatus] = useState({ configured: false, keyHint: "", provider: "Google Maps Platform" });
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/maps/integration", { credentials: "same-origin" });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) setStatus(payload);
    } finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);
  return <section className="panel maps-integration-card">
    <header><div className="integration-provider-icon"><MapPin weight="duotone" /></div><div><span>LOCATION SERVICES</span><h3>Google Maps</h3><p>Address maps for the business listing form and public profiles.</p></div><span className={`integration-status-pill ${status.configured ? "connected" : "inactive"}`}><i />{loading ? "Checking" : status.configured ? "Connected" : "Setup required"}</span></header>
    <div className="integration-summary"><div><span>Provider</span><strong>{status.provider}</strong></div><div><span>API key</span><strong>{status.keyHint || "Not configured"}</strong></div><div><span>Use</span><strong>Address search & maps</strong></div></div>
    <div className="integration-methods"><span>Secure setup</span><div><small>Add <code>GOOGLE_MAPS_API_KEY</code> in Render, restrict it in Google Cloud to <code>staging.findra.ph</code> and your production domain, then enable Maps JavaScript API, Places API, and Maps Embed API.</small></div></div>
    <footer><button type="button" className="secondary-button" onClick={refresh} disabled={loading}>{loading ? "Checking…" : "Refresh status"}</button><a className="admin-primary" href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noreferrer">Open Google Cloud <ArrowRight /></a></footer>
  </section>;
}

function BrevoIntegration({ onNotify }) {
  const [integration, setIntegration] = useState({
    account: null,
    configured: false,
    connectedAt: "",
    enabled: false,
    keyHint: "",
    loading: true,
    source: "not configured",
  });
  const [apiKey, setApiKey] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [connectEnabled, setConnectEnabled] = useState(true);
  const [busy, setBusy] = useState("");
  const [inlineError, setInlineError] = useState("");

  const applyResponse = async (response) => {
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(result.error || "The Brevo request failed.");
    setIntegration({ ...result, loading: false });
    return result;
  };
  const refreshStatus = async () => {
    setBusy("refresh");
    setInlineError("");
    try {
      await applyResponse(await fetch("/api/brevo/integration"));
    } catch (error) {
      setIntegration((current) => ({ ...current, loading: false }));
      setInlineError(error.message);
    } finally {
      setBusy("");
    }
  };
  useEffect(() => {
    refreshStatus();
  }, []);
  const connect = async (event) => {
    event.preventDefault();
    setBusy("connect");
    setInlineError("");
    try {
      const result = await applyResponse(
        await fetch("/api/brevo/integration/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey, enabled: connectEnabled }),
        }),
      );
      setApiKey("");
      onNotify?.({
        type: "success",
        title: "Brevo connected",
        message: `${result.account?.company || "Your Brevo account"} is verified and ${result.enabled ? "enabled" : "paused"}.`,
      });
    } catch (error) {
      setInlineError(error.message);
      onNotify?.({
        type: "error",
        title: "Brevo could not be connected",
        message: error.message,
      });
    } finally {
      setBusy("");
    }
  };
  const toggleIntegration = async () => {
    if (!integration.configured) {
      setInlineError("Connect and verify a Brevo API key before enabling it.");
      return;
    }
    const enabled = !integration.enabled;
    setBusy("toggle");
    setInlineError("");
    try {
      await applyResponse(
        await fetch("/api/brevo/integration", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        }),
      );
      onNotify?.({
        type: "success",
        title: enabled ? "Brevo enabled" : "Brevo disabled",
        message: enabled
          ? "Brevo is ready for Findra contacts and transactional email."
          : "Brevo messaging is paused.",
      });
    } catch (error) {
      setInlineError(error.message);
    } finally {
      setBusy("");
    }
  };
  const sendTestEmail = async (event) => {
    event.preventDefault();
    setBusy("test-email");
    setInlineError("");
    try {
      const response = await fetch("/api/brevo/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error || "Brevo could not send the test email.");
      onNotify?.({
        type: "success",
        title: "Test email accepted by Brevo",
        message: `Brevo accepted a test message for ${result.recipient}. Check its inbox, Spam, and Brevo's transactional logs.`,
      });
    } catch (error) {
      setInlineError(error.message);
      onNotify?.({
        type: "error",
        title: "Test email was not sent",
        message: error.message,
      });
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="brevo-integration-section">
      <div className="integration-provider-heading">
        <div>
          <span className="section-eyebrow">Email &amp; CRM</span>
          <h2>Brevo integration</h2>
          <p>
            Prepare Findra for transactional email, contact syncing, and
            marketing automation.
          </p>
        </div>
        <div
          className={`integration-status-pill ${integration.enabled ? "connected" : "inactive"}`}
        >
          <i />
          {integration.loading
            ? "Checking status"
            : integration.enabled
              ? "Connected"
              : integration.configured
                ? "Integration paused"
                : "Setup required"}
        </div>
      </div>
      <div className="integration-overview-grid">
        <article className="panel paymongo-integration-card brevo-provider-card">
          <header>
            <div className="integration-provider-icon brevo-icon">
              <EnvelopeSimple weight="duotone" />
            </div>
            <div>
              <span>EMAIL &amp; CONTACTS</span>
              <h3>Brevo</h3>
              <p>Transactional email, contact syncing, and automation.</p>
            </div>
            <button
              type="button"
              className={`integration-switch ${integration.enabled ? "on" : ""}`}
              aria-pressed={integration.enabled}
              aria-label={
                integration.enabled
                  ? "Disable Brevo integration"
                  : "Enable Brevo integration"
              }
              disabled={busy === "toggle" || integration.loading}
              onClick={toggleIntegration}
            >
              <i />
            </button>
          </header>
          <div className="integration-summary">
            <div>
              <span>Account</span>
              <strong>{integration.account?.company || "Not connected"}</strong>
            </div>
            <div>
              <span>API key</span>
              <strong>{integration.keyHint || "Not connected"}</strong>
            </div>
            <div>
              <span>Plan</span>
              <strong>{integration.account?.plan || "Not available"}</strong>
            </div>
          </div>
          <div className="integration-methods">
            <span>Integration capabilities</span>
            <div>
              {integration.configured ? (
                <>
                  <b>Transactional email</b>
                  <b>Contact sync</b>
                  <b>Marketing automation</b>
                </>
              ) : (
                <small>
                  Connect an API key to verify the Brevo account Findra will
                  use.
                </small>
              )}
            </div>
          </div>
          <footer>
            <button
              type="button"
              className="secondary-button"
              disabled={busy === "refresh"}
              onClick={refreshStatus}
            >
              {busy === "refresh" ? "Refreshing…" : "Refresh status"}
            </button>
            <a
              className="admin-primary"
              href="https://app.brevo.com/settings/keys/api"
              target="_blank"
              rel="noreferrer"
            >
              Open Brevo API settings <ArrowRight />
            </a>
          </footer>
          <form className="brevo-test-email" onSubmit={sendTestEmail}>
            <label htmlFor="brevo-test-recipient">
              <span>Send a transactional test</span>
              <small>Tests the live Findra server configuration only—no listing or payment required.</small>
            </label>
            <div>
              <input
                id="brevo-test-recipient"
                required
                type="email"
                autoComplete="email"
                value={testEmail}
                onChange={(event) => setTestEmail(event.target.value)}
                placeholder="you@example.com"
                disabled={!integration.enabled || busy === "test-email"}
              />
              <button
                type="submit"
                className="secondary-button"
                disabled={!integration.enabled || busy === "test-email"}
              >
                {busy === "test-email" ? "Sending…" : "Send test email"}
              </button>
            </div>
          </form>
        </article>
        <form className="panel integration-connect-card" onSubmit={connect}>
          <div className="integration-card-title">
            <div className="brevo-icon">
              <EnvelopeSimple weight="duotone" />
            </div>
            <span>
              <small>SECURE CONNECTION</small>
              <strong>
                {integration.configured
                  ? "Replace Brevo credentials"
                  : "Connect Brevo"}
              </strong>
            </span>
          </div>
          <label>
            <FieldLabel required>Brevo API key</FieldLabel>
            <input
              required
              type="password"
              autoComplete="off"
              spellCheck="false"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="xkeysib-••••••••••••••••"
            />
            <small>
              Generate a server API key from Brevo SMTP &amp; API settings.
            </small>
          </label>
          <label className="integration-enable-option">
            <input
              type="checkbox"
              checked={connectEnabled}
              onChange={(event) => setConnectEnabled(event.target.checked)}
            />
            <span>
              <strong>Enable Brevo after verification</strong>
              <small>Make the connection available to Findra workflows.</small>
            </span>
          </label>
          {inlineError && (
            <div className="integration-inline-error" role="alert">
              <WarningCircle weight="fill" /> {inlineError}
            </div>
          )}
          <button
            className="admin-primary integration-connect-button"
            disabled={busy === "connect"}
            type="submit"
          >
            {busy === "connect" ? "Verifying with Brevo…" : "Connect & verify"}
            <ArrowRight />
          </button>
          <div className="integration-security-note">
            <ShieldCheck weight="fill" />
            <p>
              <strong>Your Brevo key stays on the server.</strong>
              Findra returns only a masked hint and account summary. Configure
              BREVO_API_KEY on your host for restart persistence.
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}

function ListingActionConfirm({ action, close, confirm }) {
  const publishing = action.type === "publish";
  return (
    <div className="modal-backdrop" onClick={close}>
      <article className="listing-action-confirm" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="listing-action-title">
        <button className="listing-action-close" onClick={close} aria-label="Close confirmation"><X /></button>
        <div className={`listing-action-icon ${publishing ? "publish" : "delete"}`}>{publishing ? <CheckCircle weight="fill" /> : <Trash weight="fill" />}</div>
        <span>{publishing ? "Ready to publish" : "Delete listing"}</span>
        <h2 id="listing-action-title">{publishing ? `Publish ${action.item.name}?` : `Delete ${action.item.name}?`}</h2>
        <p>{publishing ? "The listing will become publicly visible. Its owner will receive an in-app notification and a Brevo email when delivery is configured." : "This permanently removes the listing from Findra. This action cannot be undone."}</p>
        <footer>
          <button className="secondary-button" onClick={close}>Cancel</button>
          <button className={publishing ? "admin-primary" : "danger-button"} onClick={confirm}>{publishing ? "Publish listing" : "Delete listing"}</button>
        </footer>
      </article>
    </div>
  );
}

function ListingModal({ item, close, update, edit, remove }) {
  return (
    <div className="modal-backdrop" onClick={close}>
      <article className="listing-modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <span>Listing details</span>
            <h2>{item.name}</h2>
          </div>
          <button aria-label="Close listing" onClick={close}>
            <X />
          </button>
        </header>
        <img className="modal-cover" src={item.image} alt="" />
        <div className="modal-body">
          <div className="modal-title">
            <div className={`detail-logo ${item.logo ? "has-image" : ""}`}>
              {item.logo ? (
                <img src={item.logo} alt={`${item.name} logo`} />
              ) : (
                item.name
                  .split(" ")
                  .map((x) => x[0])
                  .join("")
                  .slice(0, 2)
              )}
            </div>
            <div>
              <h3>{item.name}</h3>
              <p>
                <MapPin weight="fill" /> {item.location}
              </p>
            </div>
            <StatusPill status={item.status} />
          </div>
          <dl>
            <div>
              <dt>Owner</dt>
              <dd>{item.owner}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{item.additionalCategory || item.category}</dd>
            </div>
            <div>
              <dt>Business type</dt>
              <dd>{item.type}</dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>{item.date}</dd>
            </div>
          </dl>
          <h4>Business description</h4>
          <p>
            {item.description ||
              `${item.tagline}. This business submitted a complete profile with contact details, services, imagery, and location information.`}
          </p>
          <h4>Services</h4>
          <div className="service-tags">
            {item.services.map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
        </div>
        <footer>
          <button className="danger-button" onClick={remove}>
            <Trash /> Delete
          </button>
          <button className="secondary-button" onClick={edit}>
            <PencilSimple /> Edit
          </button>
          {item.status !== "Published" && (
            <button
              className="admin-primary"
              onClick={() => update(item.id, "Published")}
            >
              <Check /> Approve & publish
            </button>
          )}
        </footer>
      </article>
    </div>
  );
}

function ListingEditorLegacy({ item, close, save, remove }) {
  const [form, setForm] = useState({
    ...blankListing,
    ...item,
    servicesText: (item.services || []).join(", "),
  });
  const change = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    const { servicesText, ...record } = form;
    save({
      ...record,
      services: servicesText
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    });
  };
  return (
    <div className="modal-backdrop" onClick={close}>
      <form
        className="listing-modal listing-editor-modal"
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span>{item.id ? "Update listing" : "Create listing"}</span>
            <h2>{item.id ? item.name : "New business"}</h2>
          </div>
          <button type="button" aria-label="Close editor" onClick={close}>
            <X />
          </button>
        </header>
        <div className="editor-form modal-editor-form">
          <label>
            Business name
            <input
              required
              value={form.name}
              onChange={change("name")}
              placeholder="e.g. Cebu Creative Studio"
            />
          </label>
          <label>
            Owner
            <input
              required
              value={form.owner}
              onChange={change("owner")}
              placeholder="Owner or account name"
            />
          </label>
          <label>
            Business type
            <select value={form.type} onChange={change("type")}>
              <option>Business / Company</option>
              <option>Freelancer / Creative</option>
            </select>
          </label>
          <label>
            Category
            <select value={form.category} onChange={change("category")}>
              {categories.map((category) => (
                <option key={category.name}>{category.name}</option>
              ))}
            </select>
          </label>
          <label>
            Location
            <input
              required
              value={form.location}
              onChange={change("location")}
              placeholder="City, Province"
            />
          </label>
          <label>
            Status
            <select value={form.status} onChange={change("status")}>
              <option>Draft</option>
              <option>Pending</option>
              <option>Published</option>
              <option>Declined</option>
            </select>
          </label>
          <label className="wide">
            Tagline
            <input
              required
              value={form.tagline}
              onChange={change("tagline")}
              placeholder="Short description shown on cards"
            />
          </label>
          <label className="wide">
            Services
            <input
              required
              value={form.servicesText}
              onChange={change("servicesText")}
              placeholder="Separate services with commas"
            />
          </label>
          <label className="wide">
            Cover image
            <select value={form.image} onChange={change("image")}>
              {categories.map((category) => (
                <option key={category.image} value={category.image}>
                  {category.name} image
                </option>
              ))}
            </select>
          </label>
          <label className="wide">
            Business description
            <textarea
              rows="4"
              value={form.description || ""}
              onChange={change("description")}
              placeholder="Describe the business, experience, and services."
            />
          </label>
        </div>
        <footer>
          {remove && (
            <button type="button" className="danger-button" onClick={remove}>
              <Trash /> Delete
            </button>
          )}
          <button type="button" className="secondary-button" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="admin-primary">
            <Check /> {item.id ? "Save changes" : "Create listing"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function SectionLabel({ children }) {
  return <span className="form-section-label">{children}</span>;
}

function FieldLabel({ children, required = false }) {
  return (
    <span className="field-label-text">
      {children}
      {required && <em aria-hidden="true">*</em>}
    </span>
  );
}

function getYouTubeEmbedUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    const host = url.hostname.replace("www.", "");
    let id = "";
    if (host === "youtu.be")
      id = url.pathname.split("/").filter(Boolean)[0] || "";
    if (["youtube.com", "m.youtube.com"].includes(host)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
      else if (["embed", "shorts", "live"].includes(url.pathname.split("/")[1]))
        id = url.pathname.split("/")[2] || "";
    }
    return /^[\w-]{6,}$/.test(id)
      ? `https://www.youtube-nocookie.com/embed/${id}`
      : "";
  } catch {
    return "";
  }
}

const listingServiceOptions = [
  "Full Coordination",
  "Graphic Design",
  "Equipment Rental",
  "Photography",
  "Training",
  "Web & App Development",
];

function UploadBox({
  title,
  wide = false,
  multiple = false,
  accept = "image/*",
  onFiles,
  files = [],
  onRemove,
  onReplace,
}) {
  const inputId = `upload-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  const [dragging, setDragging] = useState(false);
  const chooseFiles = (selected) => {
    if (selected.length) onFiles?.(selected);
  };
  return (
    <div className={`media-upload ${wide ? "wide" : ""}`}>
      <label className="upload-title" htmlFor={inputId}>
        {title}
      </label>
      <label
        className={`drop-zone ${dragging ? "dragging" : ""}`}
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          chooseFiles(Array.from(event.dataTransfer.files || []));
        }}
      >
        <UploadSimple />
        <strong>
          {files.length
            ? multiple
              ? "Add more files"
              : "Replace image"
            : `Choose ${multiple ? "files" : "an image"}`}
        </strong>
        <span>or drag {multiple ? "them" : "it"} here</span>
        <input
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(event) => {
            chooseFiles(Array.from(event.target.files || []));
            event.target.value = "";
          }}
        />
      </label>
      {files.length > 0 && (
        <div
          className={`upload-previews ${multiple ? "multiple" : ""}`}
          aria-live="polite"
        >
          {files.map((file, index) => (
            <article className="upload-preview" key={`${file.name}-${index}`}>
              {file.url ? (
                <img src={file.url} alt={`Preview of ${file.name}`} />
              ) : (
                <div className="file-preview-icon">
                  <FileText />
                </div>
              )}
              <span>
                <strong>{file.name}</strong>
                <small>{file.type || "Selected file"}</small>
              </span>
              <div className="upload-preview-actions">
                <label
                  htmlFor={`${inputId}-replace-${index}`}
                  title={`Replace ${file.name}`}
                  aria-label={`Replace ${file.name}`}
                >
                  <PencilSimple />
                  <span>Replace</span>
                  <input
                    id={`${inputId}-replace-${index}`}
                    type="file"
                    accept={accept}
                    onChange={(event) => {
                      const selected = Array.from(event.target.files || []);
                      if (selected.length) onReplace?.(index, selected);
                      event.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  title={`Remove ${file.name}`}
                  onClick={() => onRemove?.(index)}
                >
                  <X />
                  <span>Remove</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiOptionField({
  label,
  options,
  values = [],
  onChange,
  placeholder,
  customPlaceholder,
}) {
  const [customMode, setCustomMode] = useState(false);
  const [draft, setDraft] = useState("");
  const addCustomValues = () => {
    const additions = draft
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (!additions.length) return;
    onChange([...new Set([...values, ...additions])]);
    setDraft("");
    setCustomMode(false);
  };
  return (
    <div className="multi-option-field">
      <FieldLabel required>{label}</FieldLabel>
      <select
        aria-label={label}
        required={!values.length}
        value=""
        onChange={(event) => {
          if (event.target.value === "__custom__") {
            setCustomMode(true);
            return;
          }
          if (event.target.value)
            onChange([...new Set([...values, event.target.value])]);
        }}
      >
        <option value="">
          {values.length ? `Add another ${label.toLowerCase()}` : placeholder}
        </option>
        {options
          .filter((option) => !values.includes(option))
          .map((option) => (
            <option key={option}>{option}</option>
          ))}
        <option value="__custom__">＋ Add your own</option>
      </select>
      {customMode && (
        <div className="multi-option-custom">
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustomValues();
              }
              if (event.key === "Escape") {
                setDraft("");
                setCustomMode(false);
              }
            }}
            placeholder={customPlaceholder}
          />
          <button
            type="button"
            onClick={addCustomValues}
            disabled={!draft.trim()}
          >
            <Plus /> Add
          </button>
          <button
            type="button"
            className="cancel-custom-value"
            aria-label={`Cancel custom ${label.toLowerCase()}`}
            onClick={() => {
              setDraft("");
              setCustomMode(false);
            }}
          >
            <X />
          </button>
        </div>
      )}
      <small>
        Select as many as needed. Choose “Add your own” for an unlisted value.
      </small>
      {values.length > 0 && (
        <div className="multi-value-tags" aria-live="polite">
          {values.map((value) => (
            <span key={value}>
              {value}
              <button
                type="button"
                aria-label={`Remove ${value}`}
                onClick={() =>
                  onChange(values.filter((current) => current !== value))
                }
              >
                <X />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomListingFields({ fields, values = {}, onChange }) {
  if (!fields.length) return null;
  return (
    <section className="form-block custom-listing-fields">
      <SectionLabel>Additional Business Details</SectionLabel>
      <div className="form-grid two">
        {fields.map((field) => {
          const value = values[field.slug] ?? (field.type === "Checkbox" ? false : "");
          const common = {
            id: `custom-${field.slug}`,
            required: field.required,
            value: typeof value === "boolean" ? undefined : value,
            placeholder: field.placeholder || `Enter ${field.name.toLowerCase()}`,
            onChange: (event) => onChange(field.slug, field.type === "Checkbox" ? event.target.checked : event.target.value),
          };
          return (
            <label className={field.type === "Textarea" ? "custom-field-wide" : ""} key={field.id} htmlFor={common.id}>
              <FieldLabel required={field.required}>{field.name}</FieldLabel>
              {field.type === "Textarea" ? <textarea {...common} rows="4" /> : field.type === "Select" ? <select {...common}><option value="">Choose an option</option>{(field.options || []).map((option) => <option key={option}>{option}</option>)}</select> : field.type === "Checkbox" ? <span className="custom-checkbox-control"><input id={common.id} type="checkbox" required={field.required} checked={Boolean(value)} onChange={common.onChange} /><span>{field.placeholder || `Yes, ${field.name.toLowerCase()}`}</span></span> : <input {...common} type={{ Number: "number", Email: "email", Phone: "tel", URL: "url", Date: "date" }[field.type] || "text"} />}
            </label>
          );
        })}
      </div>
    </section>
  );
}

function ListingEditor({ item, close, save, remove, planNotice, plan = findraPlan, onViewPackage }) {
  const managedTaxonomy = useMemo(readManagedTaxonomy, []);
  const managedCustomFields = useMemo(readCustomFields, []);
  const draftKey = `findra-listing-draft-${item.id || "new"}`;
  const restored = useMemo(() => {
    if (item.id) return null;
    try {
      return JSON.parse(sessionStorage.getItem(draftKey));
    } catch {
      return null;
    }
  }, [draftKey, item.id]);
  const startingItem = { ...item, ...(restored?.form || {}) };
  const initialServices = startingItem.services?.length
    ? startingItem.services
    : [startingItem.service].filter(Boolean);
  const initialService = initialServices[0] || "";
  const initialCategory =
    item.id ||
    managedTaxonomy.categories.some(
      (category) => category.name === startingItem.category,
    )
      ? startingItem.category
      : managedTaxonomy.categories[0]?.name || categories[0].name;
  const initialCategories = startingItem.categories?.length
    ? startingItem.categories
    : [startingItem.category, startingItem.additionalCategory]
        .flatMap((value) => (value || "").split(","))
        .map((value) => value.trim())
        .filter(Boolean);
  const [step, setStep] = useState(restored?.step || 0);
  const [maxStep, setMaxStep] = useState(
    restored?.maxStep || restored?.step || 0,
  );
  const [direction, setDirection] = useState("forward");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [stepError, setStepError] = useState("");
  const [draftStatus, setDraftStatus] = useState(
    restored ? "Draft restored" : "Draft ready",
  );
  const [form, setForm] = useState({
    ...blankListing,
    ...startingItem,
    category: initialCategory,
    service: initialService,
    additionalCategories: startingItem.additionalCategories?.length
      ? startingItem.additionalCategories
      : initialCategories.slice(1),
    additionalServices: startingItem.additionalServices?.length
      ? startingItem.additionalServices
      : initialServices.slice(1),
    logoName: startingItem.logoName || "",
    galleryName: startingItem.galleryName || "",
    attachmentName: startingItem.attachmentName || "",
  });
  const [uploads, setUploads] = useState(() => ({
    logo: startingItem.logo
      ? [
          {
            name: startingItem.logoName || "Business logo",
            type: "Saved image",
            url: startingItem.logo,
            data: startingItem.logo,
          },
        ]
      : [],
    featured:
      startingItem.image && (startingItem.featuredName || item.id)
        ? [
            {
              name: startingItem.featuredName || "Saved featured image",
              type: "Saved image",
              url: startingItem.image || "",
              data: startingItem.image || "",
            },
          ]
        : [],
    gallery: startingItem.galleryImages?.length
      ? startingItem.galleryImages.map((url, index) => ({
          name:
            startingItem.galleryName?.split(", ")[index] ||
            `Gallery image ${index + 1}`,
          type: "Saved image",
          url,
          data: url,
        }))
      : [],
    attachments: startingItem.attachments?.length
      ? startingItem.attachments.map((file) => ({
          ...file,
          url: file.data || file.url || "",
        }))
      : [],
  }));
  useEffect(() => {
    if (item.id) return undefined;
    setDraftStatus("Saving draft…");
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(
          draftKey,
          JSON.stringify({
            form,
            step,
            maxStep,
          }),
        );
        setDraftStatus("Draft saved");
      } catch {
        setDraftStatus("Draft is too large to auto-save");
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draftKey, form, item.id, maxStep, step]);
  const change = (key) => (event) => {
    setStepError("");
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };
  const uploadFiles = async (files) => {
    const uploaded = await Promise.all(files.map(async (file) => {
      if (file.size > 12 * 1024 * 1024) throw new Error(`${file.name} is larger than the 12 MB upload limit.`);
      const response = await fetch("/api/media/upload", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": file.type || "application/octet-stream", "X-File-Name": encodeURIComponent(file.name) },
        body: file,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Could not upload ${file.name}.`);
      return { name: payload.name || file.name, type: payload.type || file.type || "Selected file", url: payload.url, data: payload.url, key: payload.key };
    }));
    return uploaded;
  };
  const syncUploadFields = (bucket, files) =>
    setForm((current) => {
      if (bucket === "logo")
        return {
          ...current,
          logoName: files[0]?.name || "",
          logo: files[0]?.data || "",
        };
      if (bucket === "gallery")
        return {
          ...current,
          galleryName: files.map((file) => file.name).join(", "),
          galleryImages: files.map((file) => file.data).filter(Boolean),
        };
      if (bucket === "attachments")
        return {
          ...current,
          attachmentName: files.map((file) => file.name).join(", "),
          attachments: files.map(({ name, type, data }) => ({
            name,
            type,
            data,
          })),
        };
      return current;
    });
  const removeUpload = (bucket) => (index) => {
    const next = uploads[bucket].filter((_, itemIndex) => itemIndex !== index);
    setUploads((current) => ({
      ...current,
      [bucket]: current[bucket].filter((_, itemIndex) => itemIndex !== index),
    }));
    syncUploadFields(bucket, next);
  };
  const setFiles =
    (bucket, multiple = false) =>
    async (files) => {
      try {
      const added = await uploadFiles(files);
      const next = multiple
        ? [...uploads[bucket], ...added]
        : added.slice(0, 1);
      setUploads((current) => ({
        ...current,
        [bucket]: multiple ? [...current[bucket], ...added] : added.slice(0, 1),
      }));
      syncUploadFields(bucket, next);
      } catch (error) {
        setStepError(error.message || "Could not upload this file. Please try again.");
      }
    };
  const setFeatured = async (files) => {
    const file = files[0];
    if (!file) return;
    setStepError("");
    let preview;
    try {
      [preview] = await uploadFiles([file]);
    } catch (error) {
      setStepError(error.message || "Could not upload this file. Please try again.");
      return;
    }
    setUploads((current) => ({ ...current, featured: [preview] }));
    setForm((current) => ({
      ...current,
      image: preview.data,
      featuredName: file.name,
    }));
  };
  const replaceUpload = (bucket) => async (index, files) => {
    let replacement;
    try {
      [replacement] = await uploadFiles(files.slice(0, 1));
    } catch (error) {
      setStepError(error.message || "Could not upload this file. Please try again.");
      return;
    }
    if (!replacement) return;
    const next = uploads[bucket].map((file, itemIndex) =>
      itemIndex === index ? replacement : file,
    );
    setUploads((current) => ({ ...current, [bucket]: next }));
    if (bucket === "featured") {
      setForm((current) => ({
        ...current,
        image: replacement.data,
        featuredName: replacement.name,
      }));
    } else {
      syncUploadFields(bucket, next);
    }
  };
  const removeFeatured = (index) => {
    setUploads((current) => ({
      ...current,
      featured: current.featured.filter((_, itemIndex) => itemIndex !== index),
    }));
    setForm((current) => ({
      ...current,
      image: blankListing.image,
      featuredName: "",
    }));
  };
  const submit = async (event) => {
    event.preventDefault();
    if (step < 2) {
      if (!event.currentTarget.reportValidity()) {
        setStepError("Complete the required fields above before continuing.");
        return;
      }
      setStepError("");
      setDirection("forward");
      setMobilePreviewOpen(false);
      setStep((current) => Math.min(current + 1, 2));
      setMaxStep((current) => Math.max(current, step + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!uploads.featured.length) {
      setStepError(
        "Add a featured image so customers can recognize your listing.",
      );
      return;
    }
    const services = [form.service, ...(form.additionalServices || [])]
      .map((value) => value.trim())
      .filter((value, index, list) => value && list.indexOf(value) === index);
    const categoryValues = [form.category, ...(form.additionalCategories || [])]
      .map((value) => value.trim())
      .filter((value, index, list) => value && list.indexOf(value) === index);
    const { service, additionalCategory, additionalService, ...record } = form;
    const result = await save({
      ...record,
      category: categoryValues[0],
      categories: categoryValues,
      additionalCategories: categoryValues.slice(1),
      services,
      additionalServices: services.slice(1),
      tagline:
        form.tagline ||
        form.description.slice(0, 72) ||
        "Discover this business on Findra",
    });
    if (item.id && result !== false) sessionStorage.removeItem(draftKey);
  };
  const steps = ["Business details", "Contact & location", "Media & review"];
  const stepCompletion = [
    [
      Boolean(form.name.trim()),
      Boolean(form.description.trim()),
      Boolean(form.category.trim()),
      Boolean(form.service),
    ],
    [
      Boolean(form.email.trim() && form.email.includes("@")),
      Boolean(form.location.trim()),
    ],
    [Boolean(uploads.featured.length)],
  ];
  const completedRequired = stepCompletion.flat().filter(Boolean).length;
  const totalRequired = stepCompletion.flat().length;
  const completion = Math.round((completedRequired / totalRequired) * 100);
  const videoEmbedUrl = getYouTubeEmbedUrl(form.video);
  const moveToStep = (next, event) => {
    if (next > step && !event.currentTarget.form?.reportValidity()) {
      setStepError("Complete the required fields above before continuing.");
      return;
    }
    setStepError("");
    setDirection(next > step ? "forward" : "backward");
    setMobilePreviewOpen(false);
    setStep(next);
    setMaxStep((current) => Math.max(current, next));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const nextStep = (event) => {
    moveToStep(Math.min(step + 1, steps.length - 1), event);
  };
  return (
    <div
      className="listing-editor-screen"
      role="dialog"
      aria-modal="true"
      aria-label={
        item.id ? "Edit business listing" : "Add new business listing"
      }
    >
      <header className="listing-editor-top">
        <div>
          <span>Business listings</span>
          <h1>{item.id ? "Edit Your Business" : "Add New Business"}</h1>
        </div>
        <div className="listing-editor-actions">
          <ThemeToggle />
          <button type="button" onClick={close}>
            <X /> Close
          </button>
        </div>
      </header>
      <form
        className="long-listing-form multi-step-listing-form"
        onSubmit={submit}
      >
        {planNotice && (
          <div className="guest-plan-notice">
            <div>
              <span>YOUR LISTING PACKAGE</span>
              <strong>Findra Business Listing · ₱999 / year</strong>
              <small>No account is required until your listing is ready for checkout.</small>
            </div>
            <button type="button" onClick={onViewPackage}>View package details</button>
          </div>
        )}
        <div className="listing-progress-meta">
          <span>{completion}% complete</span>
          <span>
            <CheckCircle weight="fill" /> {draftStatus}
          </span>
        </div>
        <div className="listing-progress-track">
          <i style={{ width: `${completion}%` }} />
        </div>
        <div className="listing-stepper" aria-label="Listing form progress">
          {steps.map((label, index) => (
            <button
              type="button"
              className={
                index < step
                  ? "complete"
                  : index === step
                    ? "active"
                    : index <= maxStep
                      ? "visited"
                      : ""
              }
              disabled={index > maxStep}
              aria-current={index === step ? "step" : undefined}
              onClick={(event) => moveToStep(index, event)}
              key={label}
            >
              <span>{index < step ? <Check /> : index + 1}</span>
              <strong>{label}</strong>
              <small>
                {stepCompletion[index].length
                  ? `${stepCompletion[index].filter(Boolean).length}/${stepCompletion[index].length} required`
                  : "Optional"}
              </small>
              {index < steps.length - 1 && <i />}
            </button>
          ))}
        </div>
        <div className="listing-step-heading">
          <span>
            STEP {step + 1} OF {steps.length}
          </span>
          <h2>{steps[step]}</h2>
          <p>
            {step === 0
              ? "Tell people what your business does and how it should be discovered."
              : step === 1
                ? "Add the contact details and location customers will use to reach you."
                : "Bring your profile to life, then review the information before continuing."}
          </p>
        </div>
        {stepError && (
          <div className="listing-step-error" role="alert">
            <WarningCircle weight="fill" />
            {stepError}
          </div>
        )}
        <div className="mobile-editor-mode" aria-label="Listing editor view">
          <button
            type="button"
            className={!mobilePreviewOpen ? "active" : ""}
            aria-pressed={!mobilePreviewOpen}
            onClick={() => setMobilePreviewOpen(false)}
          >
            <PencilSimple /> Edit details
          </button>
          <button
            type="button"
            className={mobilePreviewOpen ? "active" : ""}
            aria-pressed={mobilePreviewOpen}
            onClick={() => setMobilePreviewOpen(true)}
          >
            <Eye /> Live preview
          </button>
        </div>
        <div className="listing-editor-workspace">
          <div
            className={`listing-editor-fields ${mobilePreviewOpen ? "mobile-hidden" : ""}`}
          >
            {step === 0 && (
              <div className="listing-step-panel">
                <section className="form-block identity-block">
                  <SectionLabel>Business Identity</SectionLabel>
                  <label>
                    <FieldLabel required>Business Name</FieldLabel>
                    <input
                      required
                      value={form.name}
                      onChange={change("name")}
                      placeholder="Enter your registered business name"
                    />
                  </label>
                  <div className="form-grid two profile-copy-fields">
                    <label>
                      <FieldLabel>Listing Card Title (Optional)</FieldLabel>
                      <input
                        value={form.cardTitle || ""}
                        onChange={change("cardTitle")}
                        maxLength="70"
                        placeholder="The title customers see in directory cards"
                      />
                      <small>{(form.cardTitle || "").length}/70 characters</small>
                    </label>
                    <label>
                      <FieldLabel>Business Tagline (Optional)</FieldLabel>
                      <input
                        value={form.tagline}
                        onChange={change("tagline")}
                        maxLength="90"
                        placeholder="A short promise shown on your listing card and profile"
                      />
                      <small>{form.tagline.length}/90 characters</small>
                    </label>
                    <label>
                      <FieldLabel>Business Owner / Representative</FieldLabel>
                      <input
                        value={form.owner}
                        onChange={change("owner")}
                        placeholder="Account holder or primary representative"
                      />
                    </label>
                  </div>
                  <label>
                    <FieldLabel required>Description</FieldLabel>
                  </label>
                  <div className="rich-editor">
                    <div className="editor-toolbar">
                      <button type="button" title="Bold">
                        <TextBolder />
                      </button>
                      <button type="button" title="Italic">
                        <TextItalic />
                      </button>
                      <button type="button" title="Underline">
                        <TextUnderline />
                      </button>
                      <button type="button" title="Bulleted list">
                        <ListBullets />
                      </button>
                      <button type="button" title="Numbered list">
                        <ListNumbers />
                      </button>
                      <button type="button" title="Add link">
                        <LinkSimple />
                      </button>
                      <button type="button" title="Expand editor">
                        <ArrowsOutSimple />
                      </button>
                    </div>
                    <textarea
                      required
                      rows="7"
                      value={form.description}
                      onChange={change("description")}
                      placeholder="Describe what your business offers, who you serve, and what makes you different"
                    />
                  </div>
                </section>
                <section className="form-block classification-block">
                  <SectionLabel>Business Classification</SectionLabel>
                  <div className="form-grid classification-fields">
                    <label>
                      <FieldLabel required>Business Type</FieldLabel>
                      <select
                        required
                        value={form.type}
                        onChange={change("type")}
                      >
                        <option>Business / Company</option>
                        <option>Freelancer / Creative</option>
                      </select>
                    </label>
                    <MultiOptionField
                      label="Business Categories"
                      placeholder="Choose a business category"
                      customPlaceholder="Type one or more categories, separated by commas"
                      options={managedTaxonomy.categories.map(
                        (category) => category.name,
                      )}
                      values={[
                        form.category,
                        ...(form.additionalCategories || []),
                      ].filter(Boolean)}
                      onChange={(values) =>
                        setForm((current) => ({
                          ...current,
                          category: values[0] || "",
                          additionalCategories: values.slice(1),
                        }))
                      }
                    />
                    <MultiOptionField
                      label="Business Services"
                      placeholder="Choose a business service"
                      customPlaceholder="Type one or more services, separated by commas"
                      options={managedTaxonomy.services.map(
                        (service) => service.name,
                      )}
                      values={[
                        form.service,
                        ...(form.additionalServices || []),
                      ].filter(Boolean)}
                      onChange={(values) =>
                        setForm((current) => ({
                          ...current,
                          service: values[0] || "",
                          additionalServices: values.slice(1),
                        }))
                      }
                    />
                  </div>
                </section>
                <CustomListingFields
                  fields={managedCustomFields.filter((field) => field.section === "Business details")}
                  values={form.customValues}
                  onChange={(slug, value) => setForm((current) => ({ ...current, customValues: { ...(current.customValues || {}), [slug]: value } }))}
                />
              </div>
            )}
            {step === 1 && (
              <div className="listing-step-panel">
                <section className="form-block contact-block">
                  <SectionLabel>Contact Information</SectionLabel>
                  <div className="form-grid two">
                    <label>
                      <FieldLabel required>Business Email Address</FieldLabel>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={change("email")}
                        placeholder="hello@yourbusiness.com"
                      />
                    </label>
                    <label>
                      <FieldLabel>Business Phone</FieldLabel>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={change("phone")}
                        placeholder="+63 917 123 4567"
                      />
                    </label>
                  </div>
                </section>
                <section className="form-block presence-block">
                  <SectionLabel>Online Presence</SectionLabel>
                  <label>
                    <FieldLabel>Business Website</FieldLabel>
                    <input
                      type="url"
                      value={form.website}
                      onChange={change("website")}
                      placeholder="https://yourbusiness.com"
                    />
                  </label>
                  <div className="form-grid two">
                    <label><FieldLabel>Facebook Page</FieldLabel><input type="url" value={form.facebook || ""} onChange={change("facebook")} placeholder="https://facebook.com/yourbusiness" /></label>
                    <label><FieldLabel>Instagram Profile</FieldLabel><input type="url" value={form.instagram || ""} onChange={change("instagram")} placeholder="https://instagram.com/yourbusiness" /></label>
                    <label><FieldLabel>LinkedIn Page (optional)</FieldLabel><input type="url" value={form.linkedin || ""} onChange={change("linkedin")} placeholder="https://linkedin.com/company/yourbusiness" /></label>
                    <label><FieldLabel>WhatsApp Number</FieldLabel><input type="tel" value={form.whatsapp || ""} onChange={change("whatsapp")} placeholder="+63 917 123 4567" /></label>
                    <label><FieldLabel>Viber Number</FieldLabel><input type="tel" value={form.viber || ""} onChange={change("viber")} placeholder="+63 917 123 4567" /></label>
                  </div>
                  <small>Add only channels you actively monitor. We recommend a website, Facebook or Instagram, and one fast messaging channel such as WhatsApp or Viber.</small>
                </section>
                <section className="form-block address-block">
                  <SectionLabel>Business Address</SectionLabel>
                  <label>
                    <FieldLabel required>Business Address</FieldLabel>
                    <GoogleAddressInput
                      value={form.location}
                      onChange={(location) => setForm((current) => ({
                        ...current,
                        location,
                        googlePlaceId: "",
                        latitude: "",
                        longitude: "",
                      }))}
                      onSelect={({ address, placeId, latitude, longitude }) => setForm((current) => ({
                        ...current,
                        location: address,
                        googlePlaceId: placeId,
                        latitude,
                        longitude,
                      }))}
                    />
                  </label>
                  <BusinessMapFrame
                    location={form.location}
                    latitude={form.latitude}
                    longitude={form.longitude}
                  />
                </section>
                <CustomListingFields
                  fields={managedCustomFields.filter((field) => field.section === "Contact & location")}
                  values={form.customValues}
                  onChange={(slug, value) => setForm((current) => ({ ...current, customValues: { ...(current.customValues || {}), [slug]: value } }))}
                />
              </div>
            )}
            {step === 2 && (
              <div className="listing-step-panel">
                <section className="form-block media-block">
                  <SectionLabel>Business Media</SectionLabel>
                  <p className="media-guidance">
                    Add or replace the real media customers should see. Every
                    saved logo, featured image, and gallery photo can be
                    replaced or removed here before you save the listing.
                  </p>
                  <div className="media-grid">
                    <UploadBox
                      title="Business Logo"
                      files={uploads.logo}
                      onFiles={setFiles("logo")}
                      onRemove={removeUpload("logo")}
                      onReplace={replaceUpload("logo")}
                    />
                    <UploadBox
                      title="Business Featured Image *"
                      files={uploads.featured}
                      onFiles={setFeatured}
                      onRemove={removeFeatured}
                      onReplace={replaceUpload("featured")}
                    />
                    <UploadBox
                      title="Business Gallery"
                      wide
                      multiple
                      files={uploads.gallery}
                      onFiles={setFiles("gallery", true)}
                      onRemove={removeUpload("gallery")}
                      onReplace={replaceUpload("gallery")}
                    />
                  </div>
                  <label className="video-field">
                    <FieldLabel>Featured Video</FieldLabel>
                    <span>Paste a public YouTube URL to preview it below</span>
                    <input
                      type="url"
                      value={form.video}
                      onChange={change("video")}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </label>
                  {videoEmbedUrl && (
                    <div className="video-preview-card" aria-live="polite">
                      <div>
                        <span>YOUTUBE PREVIEW</span>
                        <strong>Your featured video is ready</strong>
                        <a href={form.video} target="_blank" rel="noreferrer">
                          Open on YouTube <ArrowRight />
                        </a>
                      </div>
                      <iframe
                        title="Featured YouTube video preview"
                        src={videoEmbedUrl}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  )}
                  {form.video && !videoEmbedUrl && (
                    <p className="video-preview-help" role="status">
                      <WarningCircle /> Enter a valid YouTube watch, Shorts,
                      Live, or youtu.be URL to display the preview.
                    </p>
                  )}
                </section>
                <section className="form-block attachments-block">
                  <SectionLabel>Attachments</SectionLabel>
                  <UploadBox
                    title="Attachments"
                    wide
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    files={uploads.attachments}
                    onFiles={setFiles("attachments", true)}
                    onRemove={removeUpload("attachments")}
                    onReplace={replaceUpload("attachments")}
                  />
                </section>
                <CustomListingFields
                  fields={managedCustomFields.filter((field) => field.section === "Media & review")}
                  values={form.customValues}
                  onChange={(slug, value) => setForm((current) => ({ ...current, customValues: { ...(current.customValues || {}), [slug]: value } }))}
                />
              </div>
            )}
          </div>
          <aside
            className={`listing-editor-preview ${mobilePreviewOpen ? "mobile-open" : ""}`}
            aria-label="Live listing preview"
          >
            <div className="listing-preview-heading">
              <div>
                <span>Customer view</span>
                <h2>Live listing preview</h2>
              </div>
              <small>
                <CheckCircle weight="fill" /> Updates live
              </small>
            </div>
            <section className="listing-preview-card">
              <div
                className={`listing-preview-cover ${uploads.featured.length ? "has-media" : "empty"}`}
              >
                {uploads.featured[0]?.url ? (
                  <img
                    src={uploads.featured[0].url}
                    alt="Featured listing preview"
                  />
                ) : (
                  <div>
                    <ImageSquare />
                    <strong>Add your featured image</strong>
                    <small>This becomes the main listing cover.</small>
                  </div>
                )}
                <div className="listing-preview-overlay">
                  <span>{form.category || "Business category"}</span>
                  <h3>{form.cardTitle?.trim() || form.name || "Your business"}</h3>
                  <p>{form.tagline || "Your business tagline"}</p>
                </div>
              </div>
              <div className="listing-preview-body">
                <div className={`detail-logo ${form.logo ? "has-image" : ""}`}>
                  {form.logo ? (
                    <img src={form.logo} alt="Business logo preview" />
                  ) : (
                    (form.name || "Business").slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <span>LIVE LISTING PREVIEW</span>
                  <h3>{form.cardTitle?.trim() || form.name || "Your business"}</h3>
                  <p>
                    <MapPin weight="fill" /> {form.location || "Your location"}
                  </p>
                  <div className="service-tags">
                    {[form.service, ...(form.additionalServices || [])]
                      .filter(Boolean)
                      .map((service) => (
                        <span key={service}>{service}</span>
                      ))}
                    {!form.service && <span>Your service</span>}
                  </div>
                </div>
              </div>
              {uploads.gallery.length > 0 && (
                <div className="listing-preview-gallery">
                  {uploads.gallery.slice(0, 4).map((file, index) => (
                    <img
                      src={file.url}
                      alt={`Gallery preview ${index + 1}`}
                      key={`${file.name}-${index}`}
                    />
                  ))}
                </div>
              )}
              {videoEmbedUrl && (
                <div className="listing-preview-video">
                  <iframe
                    title="Listing preview featured video"
                    src={videoEmbedUrl}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              )}
            </section>
          </aside>
        </div>
        <section
          className={`form-actions multi-step-actions ${mobilePreviewOpen ? "preview-open" : ""}`}
        >
          {remove && (
            <button type="button" className="danger-button" onClick={remove}>
              <Trash /> Delete listing
            </button>
          )}
          <button
            type="button"
            className="secondary-button"
            onClick={
              step === 0 ? close : (event) => moveToStep(step - 1, event)
            }
          >
            {step === 0 ? "Cancel" : "Back"}
          </button>
          <span className="step-action-status">
            {stepCompletion[step].length
              ? `${stepCompletion[step].filter(Boolean).length} of ${stepCompletion[step].length} required complete`
              : "Optional media — add what helps you stand out"}
          </span>
          {step < steps.length - 1 ? (
            <button type="button" className="admin-primary" onClick={nextStep}>
              {step === 1 ? "Continue to Media" : "Continue"} <ArrowRight />
            </button>
          ) : (
            <button type="submit" className="admin-primary">
              {item.id ? "Save Your Business" : "Continue to Account"}
              <ArrowRight />
            </button>
          )}
        </section>
      </form>
    </div>
  );
}

function GuestAccountGate({ draft, go, createAccount, onReady }) {
  const [mode, setMode] = useState("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await createAccount({ mode, name, email, password });
      setError(result.error || "");
      if (result.account) onReady(result.account);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="guest-gate-page">
      <div className="guest-orb guest-orb-one" />
      <div className="guest-orb guest-orb-two" />
      <button className="guest-back" onClick={() => go("/")}>
        <ArrowLeft /> Back to main site
      </button>
      <main className="guest-account-card">
        <div className="guest-progress">
          <span className="done">
            <Check /> Business details
          </span>
          <i />
          <span className="active">2</span>
          <strong>Your account</strong>
          <i />
          <span>3</span>
          <strong>Checkout</strong>
        </div>
        <div className="guest-summary">
          <span>Almost there</span>
          <h1>Keep control of {draft.name}</h1>
          <p>
            Your listing is ready. Create an account or sign in so you can edit
            it, receive inquiries, and track its approval.
          </p>
          <div>
            <Storefront />
            <span>
              <strong>{draft.name}</strong>
              <small>
                {draft.category} · {draft.location}
              </small>
            </span>
          </div>
        </div>
        <div className="guest-auth-panel">
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              Create account
            </button>
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Sign in
            </button>
          </div>
          <form onSubmit={submit}>
            {mode === "register" && (
              <label>
                Your name
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  placeholder="Business owner or representative"
                />
              </label>
            )}
            <label>
              Email address
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@business.com"
              />
            </label>
            <label>
              Password
              <input
                required
                minLength="10"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                placeholder="At least 10 characters"
              />
            </label>
            {error && (
              <p className="auth-error" role="alert">
                <WarningCircle />
                {error}
              </p>
            )}
            <GreenButton disabled={submitting} type="submit" icon={<ArrowRight />}>
              {submitting
                ? "Please wait..."
                : mode === "register"
                  ? "Create account & continue"
                  : "Sign in & continue"}
            </GreenButton>
            <small className="guest-privacy">
              Your listing stays saved while you continue to secure checkout.
            </small>
          </form>
        </div>
      </main>
    </div>
  );
}

const findraPlan = {
  name: "Findra Business Listing",
  amount: 999,
  billing: "year",
};

function PayMongoCheckout({ draft, account, back, complete, plan = findraPlan }) {
  const [method, setMethod] = useState("gcash");
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [testMode, setTestMode] = useState(false);
  const methods = [
    ["gcash", "GCash", "Mobile wallet"],
    ["paymaya", "Maya", "Mobile wallet"],
    ["grab_pay", "GrabPay", "Mobile wallet"],
    ["card", "Credit / debit card", "Visa or Mastercard"],
  ];
  useEffect(() => {
    fetch("/api/paymongo/integration", { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((status) => setTestMode(status?.mode === "test"))
      .catch(() => {});
  }, []);
  useEffect(() => {
    const paymentResult = new URLSearchParams(window.location.search).get(
      "payment",
    );
    if (!paymentResult) return undefined;
    if (paymentResult === "cancelled") {
      setPaymentError(
        "Payment was cancelled. Your listing is still saved and you can try again.",
      );
      window.history.replaceState({}, "", "/add-listing");
      return undefined;
    }
    const pending = (() => {
      try {
        return JSON.parse(sessionStorage.getItem("findra-paymongo-pending"));
      } catch {
        return null;
      }
    })();
    if (paymentResult !== "success" || !pending?.sessionId) {
      setPaymentError(
        "We could not find the pending PayMongo session. Please start checkout again.",
      );
      return undefined;
    }
    let active = true;
    setProcessing(true);
    fetch(`/api/paymongo/checkout-sessions/${pending.sessionId}`, {
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (!result.paid)
          throw new Error(
            "PayMongo has not confirmed this payment yet. Please wait a moment and refresh this page.",
          );
        const completionError = await complete(pending.draft, {
          account: pending.account,
          payment: {
            amount: (result.amount || Number(plan.amount || plan.price) * 100) / 100,
            method: pending.method,
            reference: result.paymentId || result.referenceNumber,
            sessionId: result.id,
            plan: pending.plan || plan,
          },
        });
        if (completionError) throw new Error(completionError);
        sessionStorage.removeItem("findra-paymongo-pending");
      })
      .catch((error) => {
        if (active)
          setPaymentError(
            error.message || "We could not verify the PayMongo payment.",
          );
      })
      .finally(() => {
        if (active) setProcessing(false);
      });
    return () => {
      active = false;
    };
  }, [complete]);
  const pay = async (event) => {
    event.preventDefault();
    setProcessing(true);
    setPaymentError("");
    try {
      const response = await fetch("/api/paymongo/checkout-sessions", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountEmail: draft.email || account?.email || account?.username,
          accountName: account?.name,
          listingName: draft.name,
          method,
          packageId: plan.id,
        }),
      });
      const checkout = await response.json();
      if (!response.ok || !checkout.checkoutUrl)
        throw new Error(
          checkout.error || "PayMongo checkout could not be started.",
        );
      sessionStorage.setItem(
        "findra-paymongo-pending",
        JSON.stringify({
          account,
          draft,
          method,
          plan,
          referenceNumber: checkout.referenceNumber,
          sessionId: checkout.id,
        }),
      );
      window.location.assign(checkout.checkoutUrl);
    } catch (error) {
      setPaymentError(
        error.message || "PayMongo checkout could not be started.",
      );
      setProcessing(false);
    }
  };
  return (
    <div className="checkout-page">
      <div className="guest-orb guest-orb-one" />
      <div className="guest-orb guest-orb-two" />
      <header className="checkout-header">
        <BrandLogo />
        <ThemeToggle />
      </header>
      <main className="checkout-shell">
        <div className="checkout-progress">
          <span className="done">
            <Check /> Listing
          </span>
          <i />
          <span className="done">
            <Check /> Account
          </span>
          <i />
          <span className="active">3</span>
          <strong>Secure checkout</strong>
        </div>
        <section className="checkout-main">
          <button className="checkout-back" type="button" onClick={back}>
            <ArrowLeft /> Back to account
          </button>
          <span className="checkout-kicker">Complete your subscription</span>
          {testMode && <div className="paymongo-note"><CheckCircle weight="fill" /><span><strong>PayMongo test mode</strong><small>This is a sandbox checkout. No live customer payment should be used here.</small></span></div>}
          <h1>Get {draft.name} discovered.</h1>
          <p>
            Select how you want to pay through PayMongo. Your listing will be
            submitted for review once payment is confirmed.
          </p>
          <form className="payment-methods" onSubmit={pay}>
            <fieldset>
              <legend>Payment method</legend>
              {methods.map(([value, label, note]) => (
                <label
                  className={method === value ? "selected" : ""}
                  key={value}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value={value}
                    checked={method === value}
                    onChange={(event) => setMethod(event.target.value)}
                  />
                  <span className={`payment-mark ${value}`}>
                    {value === "card" ? <CreditCard /> : label.slice(0, 1)}
                  </span>
                  <span>
                    <strong>{label}</strong>
                    <small>{note}</small>
                  </span>
                  <CheckCircle weight="fill" />
                </label>
              ))}
            </fieldset>
            <div className="paymongo-note">
              <CheckCircle weight="fill" />
              <span>
                <strong>Secure payments by PayMongo</strong>
                <small>
                  You will continue to PayMongo's hosted checkout. Findra only
                  activates the listing after the server verifies payment.
                </small>
              </span>
            </div>
            {paymentError && (
              <div className="checkout-error" role="alert">
                <WarningCircle weight="fill" /> {paymentError}
              </div>
            )}
            <button
              className="paymongo-button"
              disabled={processing}
              type="submit"
            >
              {processing
                ? "Connecting to PayMongo..."
                : `Pay ₱${findraPlan.amount.toLocaleString()}`}{" "}
              <ArrowRight />
            </button>
            <small className="checkout-terms">
              By continuing, you agree to the Findra Terms of Use and
              subscription policy.
            </small>
          </form>
        </section>
        <aside className="order-summary">
          <span>ORDER SUMMARY</span>
          <div className="order-business">
            <Storefront />
            <div>
              <strong>{draft.name}</strong>
              <small>
                {draft.category} · {draft.location}
              </small>
            </div>
          </div>
          <h2>{plan.name}</h2>
          <ul>
            <li>
              <Check /> Complete public business profile
            </li>
            <li>
              <Check /> Customer inquiries and direct contact
            </li>
            <li>
              <Check /> Logo, gallery, video, and attachments
            </li>
            <li>
              <Check /> Business-owner dashboard access
            </li>
          </ul>
          <dl>
            <div>
              <dt>Annual listing</dt>
              <dd>₱{findraPlan.amount.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Processing fee</dt>
              <dd>₱0</dd>
            </div>
            <div>
              <dt>Total due today</dt>
              <dd>₱{findraPlan.amount.toLocaleString()}</dd>
            </div>
          </dl>
          <small>
            Renews every year. You can manage your subscription from your
            account.
          </small>
        </aside>
      </main>
    </div>
  );
}

function GuestListingPage({ go, session, complete, createAccount }) {
  const pendingCheckout = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("findra-paymongo-pending"));
    } catch {
      return null;
    }
  }, []);
  const [draft, setDraft] = useState(pendingCheckout?.draft || null);
  const [plan, setPlan] = useState(() => pendingCheckout?.plan || findraPlan);
  const [account, setAccount] = useState(
    session?.role === "user" ? session : pendingCheckout?.account || null,
  );
  const [stage, setStage] = useState(pendingCheckout ? "checkout" : "listing");
  useEffect(() => {
    fetch("/api/packages", { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const active = payload?.packages?.[0];
        if (!active) return;
        const nextPlan = { ...active, amount: active.price, billing: active.interval };
        Object.assign(findraPlan, nextPlan);
        setPlan(nextPlan);
      })
      .catch(() => {});
  }, []);
  const submit = (record) => {
    setDraft(record);
    setStage(account ? "checkout" : "account");
  };
  if (draft && stage === "account")
    return (
      <GuestAccountGate
        draft={draft}
        go={go}
        createAccount={createAccount}
        onReady={(nextAccount) => {
          setAccount(nextAccount);
          setStage("checkout");
        }}
      />
    );
  if (draft && stage === "checkout")
    return (
      <PayMongoCheckout
        draft={draft}
        account={account}
        back={() => setStage(session?.role === "user" ? "listing" : "account")}
        complete={complete}
        plan={plan}
      />
    );
  return (
    <ListingEditor
      item={{ ...blankListing, status: "Draft" }}
      close={() => go("/")}
      save={submit}
      planNotice
      plan={plan}
      onViewPackage={() => go("/packages")}
    />
  );
}

export function App() {
  const [path, go] = usePath();
  const [listings, setListings] = useState([]);
  const [notice, setNotice] = useState(null);
  const [session, setSession] = useState(null);
  useEffect(() => {
    fetch("/api/listings", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((payload) => {
        if (payload?.listings) setListings(payload.listings);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme =
      localStorage.getItem("findra-theme") || "light";
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = await response.json();
        return sessionFromUser(payload.user);
      })
      .then((nextSession) => {
        if (active && nextSession) setSession(nextSession);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  // Listings are now saved through the server API. Do not mirror their media
  // payloads into localStorage: base64 images can exceed browser quotas and
  // would incorrectly make a successful server save look like a failed update.
  const login = (account) => {
    setSession(account);
    go(account.role === "admin" ? "/admin" : "/user");
  };
  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => {});
    setSession(null);
    go("/");
  };
  const saveUserListing = async (record, owner = "Ina de la Cruz") => {
    try {
      if (record.id) {
        const response = await fetch(`/api/listings/${record.id}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Your listing could not be saved to the server.");
        setListings((items) => items.map((item) => (item.id === record.id ? payload.listing : item)));
        setNotice({
          type: "success",
          title: "Update confirmed",
          message: `${record.name} now shows the latest details, contact information, and media. You can reopen the listing anytime to make more changes.`,
        });
      } else {
        const response = await fetch("/api/listings", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Your listing could not be saved to the server.");
        setListings((items) => [payload.listing, ...items.filter((item) => item.name !== record.name)]);
        setNotice({
          type: "success",
          title: "Business listing submitted",
          message: `${record.name} was saved successfully and is now pending review.`,
        });
      }
      return true;
    } catch (error) {
      setNotice({
        type: "error",
        title: "The listing could not be saved",
        message:
          error.message || "Please check the form and try again. Your entries remain available in the editor.",
      });
      return false;
    }
  };
  const resolveGuestAccount = async (credentials) => {
    try {
      const result = await authRequest(
        credentials.mode === "register"
          ? "/api/auth/register"
          : "/api/auth/login",
        credentials.mode === "register"
          ? {
              name: credentials.name,
              email: credentials.email,
              password: credentials.password,
            }
          : { email: credentials.email, password: credentials.password },
      );
      const account = sessionFromUser(result.user);
      setSession(account);
      return { account, error: "" };
    } catch (requestError) {
      return {
        error: requestError.message || "We couldn't prepare your account. Please try again.",
      };
    }
    /* Legacy browser-only account code remains below temporarily for reference.
       It is unreachable and will be removed with listing data migration. */
    try {
      let account = credentials.account || null;
      const accountKey = "findra-custom-accounts";
      const customAccounts = (() => {
        try {
          return JSON.parse(localStorage.getItem(accountKey)) || [];
        } catch {
          return [];
        }
      })();
      if (!account && credentials.mode === "login")
        account = [...Object.values(demoAccounts), ...customAccounts].find(
          (item) =>
            item.role === "user" &&
            item.username.toLowerCase() ===
              credentials.email.trim().toLowerCase() &&
            item.password === credentials.password,
        );
      if (account?.status === "Suspended")
        return {
          error:
            "This account is suspended. Please contact the Findra team for help.",
        };
      if (!account && credentials.mode === "login")
        return {
          error:
            "We couldn't match that business-owner account. Check your details or create a new account.",
        };
      if (!account) {
        const email = credentials.email.trim().toLowerCase();
        if (customAccounts.some((item) => item.username === email))
          return {
            error:
              "An account already uses this email. Choose Sign in instead.",
          };
        account = {
          role: "user",
          name: credentials.name.trim(),
          username: email,
          password: credentials.password,
        };
        localStorage.setItem(
          accountKey,
          JSON.stringify([...customAccounts, account]),
        );
      }
      const safeSession = {
        role: account.role || "user",
        name: account.name,
        username: account.username,
      };
      localStorage.setItem("findra-demo-session", JSON.stringify(safeSession));
      setSession(safeSession);
      return { account: safeSession, error: "" };
    } catch {
      setNotice({
        type: "error",
        title: "Your account could not be prepared",
        message:
          "Please try again. Your business listing details are still saved in this checkout flow.",
      });
      return { error: "We couldn't prepare your account. Please try again." };
    }
  };
  const completeGuestListing = async (record, credentials) => {
    const account = credentials.account;
    if (!account) return "Please sign in or create an account before checkout.";
    const payment = credentials.payment || {};
    const paidRecord = {
      ...record,
      subscription: {
        plan: payment.plan?.name || findraPlan.name,
        amount: payment.amount || payment.plan?.amount || payment.plan?.price || findraPlan.amount,
        billing: payment.plan?.billing || payment.plan?.interval || findraPlan.billing,
        status: "Active",
        paymentMethod: payment.method || "paymongo",
        paymentReference: payment.reference || "PayMongo payment",
        paymentSessionId: payment.sessionId || "",
      },
    };
    if (!(await saveUserListing(paidRecord, account.name)))
      return "Your account is ready, but the listing could not be saved. Please try again.";
    sessionStorage.removeItem("findra-listing-draft-new");
    setNotice({
      type: "success",
      title: "Payment confirmed — listing submitted",
      message: `${record.name} is now pending review. Your PayMongo payment reference is ${payment.reference || "available in your account"}.`,
    });
    go(account.role === "admin" ? "/admin" : "/user");
    return "";
  };
  const detailItem = useMemo(() => {
    const id = Number(path.split("/")[2]);
    return listings.find((x) => x.id === id);
  }, [path, listings]);
  let page;
  if (path.startsWith("/admin"))
    page =
      session?.role === "admin" ? (
        <AdminDashboard
          go={go}
          listings={listings}
          setListings={setListings}
          onLogout={logout}
          onNotify={setNotice}
        />
      ) : (
        <LoginPage go={go} onLogin={login} />
      );
  else if (path.startsWith("/user"))
    page =
      session?.role === "user" ? (
        <UserDashboard
          go={go}
          session={session}
          listing={listings.find((item) => item.owner === session.name)}
          onSave={(record) => saveUserListing(record, session.name)}
          onLogout={logout}
        />
      ) : (
        <LoginPage go={go} onLogin={login} />
      );
  else if (path.startsWith("/add-listing"))
    page = (
      <GuestListingPage
        go={go}
        session={session}
        complete={completeGuestListing}
        createAccount={resolveGuestAccount}
      />
    );
  else if (path.startsWith("/listing/"))
    page = <ListingDetail go={go} item={detailItem} />;
  else if (path.startsWith("/listings"))
    page = <ListingsPage go={go} listings={listings} />;
  else if (path.startsWith("/about")) page = <AboutPage go={go} />;
  else if (path.startsWith("/packages")) page = <PackagesPage go={go} />;
  else if (path.startsWith("/contact")) page = <ContactPage go={go} />;
  else if (path.startsWith("/faq")) page = <FAQPage go={go} />;
  else if (path.startsWith("/legal")) page = <LegalPage go={go} />;
  else if (path.startsWith("/login"))
    page = <LoginPage go={go} onLogin={login} />;
  else page = <HomePage go={go} listings={listings} />;
  return (
    <>
      {page}
      <StatusModal notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}
