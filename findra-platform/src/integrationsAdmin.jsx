import { useEffect, useState } from "react";
import { ArrowRight, WarningCircle } from "@phosphor-icons/react";

function useIntegration(path, fallback) {
  const [status, setStatus] = useState({ ...fallback, loading: true });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const apply = async (response) => {
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "The integration request failed.");
    setStatus({ ...result, loading: false });
    return result;
  };
  const refresh = async () => {
    setBusy("refresh");
    setError("");
    try {
      await apply(await fetch(path, { credentials: "same-origin" }));
    } catch (err) {
      setStatus((current) => ({ ...current, loading: false }));
      setError(err.message);
    } finally {
      setBusy("");
    }
  };
  useEffect(() => {
    refresh();
  }, []);
  return { status, busy, setBusy, error, setError, apply, refresh };
}

function statusLabel(status) {
  if (status.loading) return "Checking";
  if (status.enabled === false && (status.configured || status.keyHint)) return "Paused";
  if (status.ready || status.configured || status.keyHint) return "Connected";
  return "Not connected";
}

function PayMongoLogo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0B1220" />
      <path d="M9 22V10h7.2c3.3 0 5.3 1.9 5.3 4.7 0 2.9-2 4.8-5.3 4.8H13.4V22H9zm4.4-5.7h2.6c1.5 0 2.4-.8 2.4-2.1s-.9-2.1-2.4-2.1h-2.6v4.2z" fill="#00D47C" />
    </svg>
  );
}
function BrevoLogo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0B996E" />
      <path d="M8.5 8.5h9.2c3.4 0 5.6 1.9 5.6 4.7 0 1.8-1 3.2-2.7 4 1.9.7 3.1 2.2 3.1 4.3 0 3.1-2.4 5.3-6.2 5.3H8.5V8.5zm4.2 6.9h4.7c1.4 0 2.2-.7 2.2-1.9s-.8-1.8-2.2-1.8h-4.7v3.7zm0 8.1h5.2c1.6 0 2.6-.8 2.6-2.1s-1-2-2.6-2h-5.2v4.1z" fill="#fff" />
    </svg>
  );
}
function GoogleMapsLogo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#fff" />
      <path d="M16 6c-3.9 0-7 3-7 7.1 0 5.3 7 12.9 7 12.9s7-7.6 7-12.9C23 9 19.9 6 16 6z" fill="#EA4335" />
      <path d="M16 6c-.6 0-1.2.1-1.8.3 2.6 1.1 4.3 3.8 4.3 6.8 0 3.7-2.8 8.2-5.5 11.6 3.3-3.9 8-10.1 8-13.6C21 9 19 6 16 6z" fill="#FBBC04" />
      <circle cx="16" cy="13.1" r="3.1" fill="#4285F4" />
      <circle cx="16" cy="13.1" r="1.4" fill="#fff" />
      <path d="M11.2 9.2C9.8 10.4 9 12.1 9 13.1c0 2 .9 4.4 2.2 6.8 1.1-2.7 1.8-5.5 1.8-6.8 0-1.4-.6-2.7-1.8-3.9z" fill="#34A853" />
    </svg>
  );
}
function CloudflareLogo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#F6821F" />
      <path d="M8.2 19.4c.3-4.1 3.7-6.4 7.6-6.4 2.4 0 4.3.8 5.6 2.3 1-.7 2.2-1 3.4-.7 1.7.4 3 1.8 3.3 3.5H8.4c0 .3-.2.6-.2 1z" fill="#fff" />
      <path d="M7 20.4c-.2 0-.4.2-.4.5 0 .1 0 .2.1.3l1.5 2.6c.1.2.3.3.5.3h15.1c.3 0 .5-.2.5-.5v-.1c-.2-.8-.8-1.4-1.6-1.6L7 20.4z" fill="#FCD7B6" />
    </svg>
  );
}
function TextBeeLogo() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#111827" />
      <ellipse cx="16" cy="17" rx="7.5" ry="6.2" fill="#F5C518" />
      <path d="M11 17h10M11.8 14.4h8.4M11.8 19.6h8.4" stroke="#111827" strokeWidth="1.6" />
      <circle cx="13.2" cy="11.2" r="1.2" fill="#F5C518" />
      <circle cx="18.8" cy="11.2" r="1.2" fill="#F5C518" />
      <path d="M16 11.4V8.6" stroke="#F5C518" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Card({ brand, logo, kicker, title, copy, status, enabled, onToggle, toggling, children }) {
  const label = statusLabel(status);
  const on = label === "Connected";
  return (
    <article className={`findra-int-card brand-${brand} ${on ? "is-on" : ""}`}>
      <header className="findra-int-head">
        <span className="findra-int-logo">{logo}</span>
        <div>
          <small>{kicker}</small>
          <h3>{title}</h3>
          <p>{copy}</p>
        </div>
        <div className="findra-int-head-meta">
          <span className={`findra-int-pill ${on ? "on" : label === "Paused" ? "paused" : ""}`}>{label}</span>
          {onToggle && (
            <button
              type="button"
              className={`findra-int-switch ${enabled ? "on" : ""}`}
              aria-label={`${enabled ? "Disable" : "Enable"} ${title}`}
              disabled={toggling || status.loading}
              onClick={onToggle}
            >
              <i />
            </button>
          )}
        </div>
      </header>
      {children}
    </article>
  );
}

function Fields({ children }) {
  return <div className="findra-int-fields">{children}</div>;
}

function Actions({ children }) {
  return <div className="findra-int-actions">{children}</div>;
}

export function IntegrationsAdmin({ onNotify }) {
  return (
    <div className="admin-content findra-integrations">
      <section className="welcome-row">
        <div>
          <span className="section-eyebrow">Connected services</span>
          <h2>Integrations</h2>
          <p>Connect payments, email, maps, file storage, and SMS. Keys stay on the Findra server.</p>
        </div>
      </section>
      <div className="findra-int-list">
        <PayMongoIntegration onNotify={onNotify} />
        <BrevoIntegration onNotify={onNotify} />
        <GoogleMapsIntegration onNotify={onNotify} />
        <R2Integration onNotify={onNotify} />
        <TextBeeIntegration onNotify={onNotify} />
      </div>
    </div>
  );
}

function PayMongoIntegration({ onNotify }) {
  const { status, busy, setBusy, error, setError, apply } = useIntegration("/api/paymongo/integration", {
    configured: false, enabled: false, keyHint: "", mode: "test", appUrl: "", availableModes: { test: false, live: false },
  });
  const [form, setForm] = useState({ testSecretKey: "", liveSecretKey: "", mode: "test", appUrl: "", enabled: true });
  useEffect(() => {
    if (!status.loading) {
      setForm((current) => ({
        ...current,
        mode: status.mode === "live" ? "live" : "test",
        appUrl: status.appUrl || current.appUrl,
        enabled: status.enabled !== false,
      }));
    }
  }, [status.loading, status.mode, status.appUrl, status.enabled]);
  const toggle = async () => {
    if (!status.configured) return setError("Save a PayMongo key first.");
    const enabled = !status.enabled;
    setBusy("toggle");
    setError("");
    try {
      await apply(await fetch("/api/paymongo/integration", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) }));
      onNotify?.({ type: "success", title: enabled ? "PayMongo on" : "PayMongo paused", message: enabled ? "Checkout is available." : "Checkout is paused." });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };
  const save = async (event) => {
    event.preventDefault();
    setBusy("connect");
    setError("");
    try {
      await apply(await fetch("/api/paymongo/integration/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }));
      setForm((current) => ({ ...current, testSecretKey: "", liveSecretKey: "" }));
      onNotify?.({ type: "success", title: "PayMongo saved", message: `${form.mode === "live" ? "Live" : "Test"} checkout is ready.` });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <Card brand="paymongo" logo={<PayMongoLogo />} kicker="Payments" title="PayMongo" copy="Cards, GCash, QR Ph, and online banking." status={status} enabled={status.enabled} toggling={busy === "toggle"} onToggle={toggle}>
      <p className="findra-int-meta">{status.mode === "live" ? "Live" : "Test"}{status.keyHint ? ` · ${status.keyHint}` : ""}</p>
      <form onSubmit={save}>
        <Fields>
          <label>Test key<input type="password" autoComplete="off" value={form.testSecretKey} onChange={(event) => setForm({ ...form, testSecretKey: event.target.value })} placeholder={status.availableModes?.test ? "Saved — paste to replace" : "sk_test_…"} /></label>
          <label>Live key<input type="password" autoComplete="off" value={form.liveSecretKey} onChange={(event) => setForm({ ...form, liveSecretKey: event.target.value })} placeholder={status.availableModes?.live ? "Saved — paste to replace" : "sk_live_…"} /></label>
          <label>Mode
            <select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}>
              <option value="test">Test</option>
              <option value="live">Live</option>
            </select>
          </label>
          <label>Return URL<input type="url" value={form.appUrl} onChange={(event) => setForm({ ...form, appUrl: event.target.value })} placeholder="https://findra.ph" /></label>
        </Fields>
        {error && <p className="findra-int-error"><WarningCircle weight="fill" /> {error}</p>}
        <Actions>
          <button className="admin-primary" disabled={busy === "connect"} type="submit">{busy === "connect" ? "Saving…" : "Save PayMongo"}</button>
          <a href="https://dashboard.paymongo.com/developers" target="_blank" rel="noreferrer">PayMongo dashboard <ArrowRight /></a>
        </Actions>
      </form>
    </Card>
  );
}

function BrevoIntegration({ onNotify }) {
  const { status, busy, setBusy, error, setError, apply } = useIntegration("/api/brevo/integration", {
    configured: false, enabled: false, keyHint: "", fromEmail: "", fromName: "Findra PH", newsletterListId: "",
  });
  const [form, setForm] = useState({ apiKey: "", fromEmail: "", fromName: "Findra PH", newsletterListId: "", enabled: true });
  const [testEmail, setTestEmail] = useState("");
  useEffect(() => {
    if (!status.loading) setForm((current) => ({ ...current, fromEmail: status.fromEmail || current.fromEmail, fromName: status.fromName || current.fromName, newsletterListId: status.newsletterListId || current.newsletterListId, enabled: status.enabled !== false }));
  }, [status.loading, status.fromEmail, status.fromName, status.newsletterListId, status.enabled]);
  const toggle = async () => {
    if (!status.configured) return setError("Save a Brevo key first.");
    const enabled = !status.enabled;
    setBusy("toggle");
    setError("");
    try {
      await apply(await fetch("/api/brevo/integration", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) }));
      onNotify?.({ type: "success", title: enabled ? "Brevo on" : "Brevo paused", message: enabled ? "Email delivery is on." : "Email delivery is paused." });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };
  const save = async (event) => {
    event.preventDefault();
    setBusy("connect");
    setError("");
    try {
      await apply(await fetch("/api/brevo/integration/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }));
      setForm((current) => ({ ...current, apiKey: "" }));
      onNotify?.({ type: "success", title: "Brevo saved", message: "Sender and API key are ready." });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };
  const sendTest = async (event) => {
    event.preventDefault();
    setBusy("test");
    setError("");
    try {
      const response = await fetch("/api/brevo/test-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: testEmail }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Test email was not sent.");
      onNotify?.({ type: "success", title: "Test email sent", message: `Check ${result.recipient || testEmail}.` });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <Card brand="brevo" logo={<BrevoLogo />} kicker="Email" title="Brevo" copy="Transactional mail, newsletter signups, and sender identity." status={status} enabled={status.enabled} toggling={busy === "toggle"} onToggle={toggle}>
      <p className="findra-int-meta">{status.fromEmail || "No sender yet"}{status.keyHint ? ` · ${status.keyHint}` : ""}</p>
      <form onSubmit={save}>
        <Fields>
          <label>API key<input required={!status.configured} type="password" autoComplete="off" value={form.apiKey} onChange={(event) => setForm({ ...form, apiKey: event.target.value })} placeholder={status.keyHint ? "Saved — paste to replace" : "xkeysib-…"} /></label>
          <label>From name<input required value={form.fromName} onChange={(event) => setForm({ ...form, fromName: event.target.value })} placeholder="Findra PH" /></label>
          <label>From email<input required type="email" value={form.fromEmail} onChange={(event) => setForm({ ...form, fromEmail: event.target.value })} placeholder="hello@findra.ph" /></label>
          <label>List ID<input value={form.newsletterListId} onChange={(event) => setForm({ ...form, newsletterListId: event.target.value })} placeholder="Optional" /></label>
        </Fields>
        {error && <p className="findra-int-error"><WarningCircle weight="fill" /> {error}</p>}
        <Actions>
          <button className="admin-primary" disabled={busy === "connect"} type="submit">{busy === "connect" ? "Saving…" : "Save Brevo"}</button>
          <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noreferrer">Brevo settings <ArrowRight /></a>
        </Actions>
      </form>
      <form className="findra-int-test" onSubmit={sendTest}>
        <input required type="email" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} placeholder="Send a test to…" disabled={!status.enabled} />
        <button type="submit" className="secondary-button" disabled={!status.enabled || busy === "test"}>{busy === "test" ? "Sending…" : "Send test"}</button>
      </form>
    </Card>
  );
}

function GoogleMapsIntegration({ onNotify }) {
  const { status, busy, setBusy, error, setError, apply } = useIntegration("/api/maps/integration", { configured: false, keyHint: "" });
  const [apiKey, setApiKey] = useState("");
  const save = async (event) => {
    event.preventDefault();
    setBusy("connect");
    setError("");
    try {
      await apply(await fetch("/api/maps/integration/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey, enabled: true }) }));
      setApiKey("");
      onNotify?.({ type: "success", title: "Maps saved", message: "Address search and listing maps can use this key." });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <Card brand="google" logo={<GoogleMapsLogo />} kicker="Location" title="Google Maps" copy="Address search on listing forms and public maps." status={status}>
      <p className="findra-int-meta">{status.keyHint || "No key yet"}</p>
      <form onSubmit={save}>
        <Fields>
          <label className="findra-int-wide">API key<input required={!status.keyHint} type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={status.keyHint ? "Saved — paste to replace" : "AIza…"} /></label>
        </Fields>
        {error && <p className="findra-int-error"><WarningCircle weight="fill" /> {error}</p>}
        <Actions>
          <button className="admin-primary" disabled={busy === "connect"} type="submit">{busy === "connect" ? "Saving…" : "Save Maps"}</button>
          <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noreferrer">Google Cloud <ArrowRight /></a>
        </Actions>
      </form>
    </Card>
  );
}

function R2Integration({ onNotify }) {
  const { status, busy, setBusy, error, setError, apply } = useIntegration("/api/r2/integration", {
    configured: false, enabled: false, bucketName: "", endpoint: "", accountHint: "", keyHint: "",
  });
  const [form, setForm] = useState({ accountId: "", accessKeyId: "", secretAccessKey: "", bucketName: "", endpoint: "", enabled: true });
  useEffect(() => {
    if (!status.loading) setForm((current) => ({ ...current, bucketName: status.bucketName || current.bucketName, endpoint: status.endpoint || current.endpoint, enabled: status.enabled !== false }));
  }, [status.loading, status.bucketName, status.endpoint, status.enabled]);
  const toggle = async () => {
    if (!status.configured && !status.bucketName) return setError("Save R2 details first.");
    const enabled = !status.enabled;
    setBusy("toggle");
    try {
      await apply(await fetch("/api/r2/integration", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) }));
      onNotify?.({ type: "success", title: enabled ? "Storage on" : "Storage paused", message: enabled ? "Uploads can use this bucket." : "Uploads are paused." });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };
  const save = async (event) => {
    event.preventDefault();
    setBusy("connect");
    setError("");
    try {
      await apply(await fetch("/api/r2/integration/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }));
      setForm((current) => ({ ...current, accessKeyId: "", secretAccessKey: "" }));
      onNotify?.({ type: "success", title: "R2 saved", message: `Bucket ${form.bucketName || status.bucketName} is verified.` });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <Card brand="cloudflare" logo={<CloudflareLogo />} kicker="Files" title="Cloudflare R2" copy="Logos, galleries, videos, and brochures." status={status} enabled={status.enabled} toggling={busy === "toggle"} onToggle={toggle}>
      <p className="findra-int-meta">{status.bucketName || "No bucket yet"}{status.keyHint ? ` · ${status.keyHint}` : ""}</p>
      <form onSubmit={save}>
        <Fields>
          <label>Account ID<input required={!status.accountHint} value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })} placeholder={status.accountHint || "Account ID"} /></label>
          <label>Access key<input required={!status.keyHint} autoComplete="off" value={form.accessKeyId} onChange={(event) => setForm({ ...form, accessKeyId: event.target.value })} placeholder={status.keyHint || "Access key ID"} /></label>
          <label>Secret key<input required={!status.keyHint} type="password" autoComplete="off" value={form.secretAccessKey} onChange={(event) => setForm({ ...form, secretAccessKey: event.target.value })} placeholder="Secret access key" /></label>
          <label>Bucket<input required value={form.bucketName} onChange={(event) => setForm({ ...form, bucketName: event.target.value })} placeholder="findra-media" /></label>
        </Fields>
        {error && <p className="findra-int-error"><WarningCircle weight="fill" /> {error}</p>}
        <Actions>
          <button className="admin-primary" disabled={busy === "connect"} type="submit">{busy === "connect" ? "Checking bucket…" : "Save R2"}</button>
          <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer">Cloudflare <ArrowRight /></a>
        </Actions>
      </form>
    </Card>
  );
}

function TextBeeIntegration({ onNotify }) {
  const { status, busy, setBusy, error, setError, apply } = useIntegration("/api/textbee/integration", {
    configured: false, enabled: false, ready: false, deviceHint: "Not configured",
  });
  const [form, setForm] = useState({ apiKey: "", deviceId: "", enabled: true });
  const save = async (event) => {
    event.preventDefault();
    setBusy("connect");
    setError("");
    try {
      await apply(await fetch("/api/textbee/integration/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }));
      setForm({ apiKey: "", deviceId: "", enabled: form.enabled });
      onNotify?.({ type: "success", title: "SMS saved", message: "TextBee can send Findra alerts." });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <Card brand="textbee" logo={<TextBeeLogo />} kicker="SMS" title="TextBee" copy="Optional SMS next to Brevo email." status={status}>
      <p className="findra-int-meta">{status.deviceHint}</p>
      <form onSubmit={save}>
        <Fields>
          <label>API key<input required={!status.configured} type="password" autoComplete="off" value={form.apiKey} onChange={(event) => setForm({ ...form, apiKey: event.target.value })} placeholder="API key" /></label>
          <label>Device ID<input required={!status.configured} value={form.deviceId} onChange={(event) => setForm({ ...form, deviceId: event.target.value })} placeholder="Device ID" /></label>
        </Fields>
        {error && <p className="findra-int-error"><WarningCircle weight="fill" /> {error}</p>}
        <Actions>
          <button className="admin-primary" disabled={busy === "connect"} type="submit">{busy === "connect" ? "Saving…" : "Save SMS"}</button>
        </Actions>
      </form>
    </Card>
  );
}
