import { useEffect, useState } from "react";
import {
  ArrowRight,
  Cloud,
  CreditCard,
  EnvelopeSimple,
  MapPin,
  Phone,
  Plug,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";

function FieldLabel({ children, required }) {
  return (
    <span>
      {children}
      {required ? " *" : ""}
    </span>
  );
}

function useIntegration(path, fallback) {
  const [status, setStatus] = useState({ ...fallback, loading: true });
  const [busy, setBusy] = useState("");
  const [inlineError, setInlineError] = useState("");
  const apply = async (response) => {
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "The integration request failed.");
    setStatus({ ...result, loading: false });
    return result;
  };
  const refresh = async () => {
    setBusy("refresh");
    setInlineError("");
    try {
      await apply(await fetch(path, { credentials: "same-origin" }));
    } catch (error) {
      setStatus((current) => ({ ...current, loading: false }));
      setInlineError(error.message);
    } finally {
      setBusy("");
    }
  };
  useEffect(() => {
    refresh();
  }, []);
  return { status, setStatus, busy, setBusy, inlineError, setInlineError, apply, refresh };
}

function SecurityNote({ children }) {
  return (
    <div className="integration-security-note">
      <ShieldCheck weight="fill" />
      <p>{children}</p>
    </div>
  );
}

export function IntegrationsAdmin({ onNotify, embedded = false }) {
  return (
    <div className={embedded ? "integrations-admin embedded" : "admin-content integrations-admin"}>
      {!embedded && (
        <section className="welcome-row integrations-welcome">
          <div>
            <span className="section-eyebrow">Connected services</span>
            <h2>Integrations</h2>
            <p>Connect payment, email, maps, file storage, and SMS from this page. Keys stay on the Findra server and are never shown back in full.</p>
          </div>
          <div className="integration-status-pill provider-count">
            <i />5 service providers
          </div>
        </section>
      )}
      <PayMongoIntegration onNotify={onNotify} />
      <BrevoIntegration onNotify={onNotify} />
      <GoogleMapsIntegration onNotify={onNotify} />
      <R2Integration onNotify={onNotify} />
      <TextBeeIntegration onNotify={onNotify} />
    </div>
  );
}

function PayMongoIntegration({ onNotify }) {
  const { status, busy, setBusy, inlineError, setInlineError, apply, refresh } = useIntegration("/api/paymongo/integration", {
    configured: false,
    enabled: false,
    keyHint: "",
    mode: "not configured",
    paymentMethods: [],
    source: "not configured",
    appUrl: "",
    availableModes: { test: false, live: false },
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
    if (!status.configured) return setInlineError("Connect and verify a secret key before enabling checkout.");
    const enabled = !status.enabled;
    setBusy("toggle");
    setInlineError("");
    try {
      await apply(await fetch("/api/paymongo/integration", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) }));
      onNotify?.({ type: "success", title: enabled ? "PayMongo enabled" : "PayMongo disabled", message: enabled ? "Customers can now continue to PayMongo checkout." : "New PayMongo checkout sessions are paused." });
    } catch (error) {
      setInlineError(error.message);
    } finally {
      setBusy("");
    }
  };
  const connect = async (event) => {
    event.preventDefault();
    setBusy("connect");
    setInlineError("");
    try {
      await apply(await fetch("/api/paymongo/integration/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }));
      setForm((current) => ({ ...current, testSecretKey: "", liveSecretKey: "" }));
      onNotify?.({ type: "success", title: "PayMongo connected", message: `${form.mode === "live" ? "Live" : "Test"} checkout is verified and ${form.enabled ? "enabled" : "paused"}.` });
    } catch (error) {
      setInlineError(error.message);
      onNotify?.({ type: "error", title: "PayMongo could not be connected", message: error.message });
    } finally {
      setBusy("");
    }
  };
  return (
    <section className="integration-overview-grid">
      <article className="panel paymongo-integration-card">
        <header>
          <div className="integration-provider-icon"><CreditCard weight="duotone" /></div>
          <div>
            <span>PAYMENT GATEWAY</span>
            <h3>PayMongo</h3>
            <p>Cards, GCash, QRPh, and online banking (BPI, UnionBank).</p>
          </div>
          <button type="button" className={`integration-switch ${status.enabled ? "on" : ""}`} aria-pressed={status.enabled} disabled={busy === "toggle" || status.loading} onClick={toggle}><i /></button>
        </header>
        <div className="integration-summary">
          <div><span>Environment</span><strong>{status.mode}</strong></div>
          <div><span>Secret key</span><strong>{status.keyHint || "Not connected"}</strong></div>
          <div><span>Saved in</span><strong>{status.source}</strong></div>
        </div>
        <div className="integration-methods">
          <span>Verified payment methods</span>
          <div>
            {status.paymentMethods?.length ? status.paymentMethods.map((method) => <b key={method}>{method.replaceAll("_", " ")}</b>) : <small>Connect a key to confirm checkout can run.</small>}
          </div>
        </div>
        <footer>
          <button type="button" className="secondary-button" disabled={busy === "refresh"} onClick={refresh}>{busy === "refresh" ? "Refreshing…" : "Refresh status"}</button>
          <a className="admin-primary" href="https://dashboard.paymongo.com/developers" target="_blank" rel="noreferrer">Open PayMongo dashboard <ArrowRight /></a>
        </footer>
      </article>
      <form className="panel integration-connect-card" onSubmit={connect}>
        <div className="integration-card-title">
          <div><Plug weight="duotone" /></div>
          <span><small>SECURE CONNECTION</small><strong>{status.configured ? "Update PayMongo keys" : "Connect PayMongo"}</strong></span>
        </div>
        <label>
          <FieldLabel>Test secret key</FieldLabel>
          <input type="password" autoComplete="off" value={form.testSecretKey} onChange={(event) => setForm({ ...form, testSecretKey: event.target.value })} placeholder={status.availableModes?.test ? "sk_test_•••• (saved)" : "sk_test_••••••••••••••••"} />
        </label>
        <label>
          <FieldLabel>Live secret key</FieldLabel>
          <input type="password" autoComplete="off" value={form.liveSecretKey} onChange={(event) => setForm({ ...form, liveSecretKey: event.target.value })} placeholder={status.availableModes?.live ? "sk_live_•••• (saved)" : "sk_live_••••••••••••••••"} />
        </label>
        <label>
          <FieldLabel>Active mode</FieldLabel>
          <select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}>
            <option value="test">Test — sandbox checkout</option>
            <option value="live">Live — real customer payments</option>
          </select>
        </label>
        <label>
          <FieldLabel>Public site URL</FieldLabel>
          <input type="url" value={form.appUrl} onChange={(event) => setForm({ ...form, appUrl: event.target.value })} placeholder="https://findra.ph" />
          <small>PayMongo returns customers here after checkout. Leave blank to use the current domain.</small>
        </label>
        <label className="integration-enable-option">
          <input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />
          <span><strong>Enable PayMongo after verification</strong><small>Allow listing checkout as soon as the key is verified.</small></span>
        </label>
        {inlineError && <div className="integration-inline-error" role="alert"><WarningCircle weight="fill" /> {inlineError}</div>}
        <button className="admin-primary integration-connect-button" disabled={busy === "connect"} type="submit">{busy === "connect" ? "Verifying with PayMongo…" : "Connect & verify"}<ArrowRight /></button>
        <SecurityNote><strong>Secret keys stay on the server.</strong> Findra stores them with the rest of your admin settings and only shows a masked hint here.</SecurityNote>
      </form>
    </section>
  );
}

function BrevoIntegration({ onNotify }) {
  const { status, busy, setBusy, inlineError, setInlineError, apply, refresh } = useIntegration("/api/brevo/integration", {
    account: null, configured: false, enabled: false, keyHint: "", source: "not configured", fromEmail: "", fromName: "Findra PH", newsletterListId: "",
  });
  const [form, setForm] = useState({ apiKey: "", fromEmail: "", fromName: "Findra PH", newsletterListId: "", enabled: true });
  const [testEmail, setTestEmail] = useState("");
  useEffect(() => {
    if (!status.loading) setForm((current) => ({ ...current, fromEmail: status.fromEmail || current.fromEmail, fromName: status.fromName || current.fromName, newsletterListId: status.newsletterListId || current.newsletterListId, enabled: status.enabled !== false }));
  }, [status.loading, status.fromEmail, status.fromName, status.newsletterListId, status.enabled]);
  const connect = async (event) => {
    event.preventDefault();
    setBusy("connect");
    setInlineError("");
    try {
      const result = await apply(await fetch("/api/brevo/integration/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }));
      setForm((current) => ({ ...current, apiKey: "" }));
      onNotify?.({ type: "success", title: "Brevo connected", message: `${result.account?.company || "Your Brevo account"} is verified and ${result.enabled ? "enabled" : "paused"}.` });
    } catch (error) {
      setInlineError(error.message);
      onNotify?.({ type: "error", title: "Brevo could not be connected", message: error.message });
    } finally {
      setBusy("");
    }
  };
  const toggle = async () => {
    if (!status.configured) return setInlineError("Connect and verify a Brevo API key before enabling it.");
    const enabled = !status.enabled;
    setBusy("toggle");
    setInlineError("");
    try {
      await apply(await fetch("/api/brevo/integration", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) }));
      onNotify?.({ type: "success", title: enabled ? "Brevo enabled" : "Brevo disabled", message: enabled ? "Brevo is ready for Findra contacts and transactional email." : "Brevo messaging is paused." });
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
      const response = await fetch("/api/brevo/test-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: testEmail }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Brevo could not send the test email.");
      onNotify?.({ type: "success", title: "Test email accepted by Brevo", message: `Brevo accepted a test message for ${result.recipient || testEmail}.` });
    } catch (error) {
      setInlineError(error.message);
      onNotify?.({ type: "error", title: "Test email was not sent", message: error.message });
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
          <p>Transactional email, newsletter signups, and automation sender identity.</p>
        </div>
        <div className={`integration-status-pill ${status.enabled ? "connected" : "inactive"}`}><i />{status.loading ? "Checking status" : status.enabled ? "Connected" : status.configured ? "Integration paused" : "Setup required"}</div>
      </div>
      <div className="integration-overview-grid">
        <article className="panel paymongo-integration-card brevo-provider-card">
          <header>
            <div className="integration-provider-icon brevo-icon"><EnvelopeSimple weight="duotone" /></div>
            <div><span>EMAIL &amp; CONTACTS</span><h3>Brevo</h3><p>Transactional email, contact syncing, and automation.</p></div>
            <button type="button" className={`integration-switch ${status.enabled ? "on" : ""}`} disabled={busy === "toggle" || status.loading} onClick={toggle}><i /></button>
          </header>
          <div className="integration-summary">
            <div><span>Account</span><strong>{status.account?.company || "Not connected"}</strong></div>
            <div><span>API key</span><strong>{status.keyHint || "Not connected"}</strong></div>
            <div><span>Sender</span><strong>{status.fromEmail || "Not set"}</strong></div>
          </div>
          <footer>
            <button type="button" className="secondary-button" disabled={busy === "refresh"} onClick={refresh}>{busy === "refresh" ? "Refreshing…" : "Refresh status"}</button>
            <a className="admin-primary" href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noreferrer">Open Brevo API settings <ArrowRight /></a>
          </footer>
          <form className="brevo-test-email" onSubmit={sendTestEmail}>
            <label htmlFor="brevo-test-recipient"><span>Send a transactional test</span></label>
            <div>
              <input id="brevo-test-recipient" required type="email" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} placeholder="you@example.com" disabled={!status.enabled || busy === "test-email"} />
              <button type="submit" className="secondary-button" disabled={!status.enabled || busy === "test-email"}>{busy === "test-email" ? "Sending…" : "Send test email"}</button>
            </div>
          </form>
        </article>
        <form className="panel integration-connect-card" onSubmit={connect}>
          <div className="integration-card-title"><div className="brevo-icon"><EnvelopeSimple weight="duotone" /></div><span><small>SECURE CONNECTION</small><strong>{status.configured ? "Update Brevo credentials" : "Connect Brevo"}</strong></span></div>
          <label><FieldLabel required={!status.configured}>Brevo API key</FieldLabel><input required={!status.configured} type="password" autoComplete="off" value={form.apiKey} onChange={(event) => setForm({ ...form, apiKey: event.target.value })} placeholder="xkeysib-••••••••••••••••" /></label>
          <label><FieldLabel required>Sender name</FieldLabel><input required value={form.fromName} onChange={(event) => setForm({ ...form, fromName: event.target.value })} placeholder="Findra PH" /></label>
          <label><FieldLabel required>Sender email</FieldLabel><input required type="email" value={form.fromEmail} onChange={(event) => setForm({ ...form, fromEmail: event.target.value })} placeholder="hello@findra.ph" /><small>Must be a domain authenticated in Brevo.</small></label>
          <label><FieldLabel>Newsletter list ID</FieldLabel><input value={form.newsletterListId} onChange={(event) => setForm({ ...form, newsletterListId: event.target.value })} placeholder="Optional numeric list ID" /></label>
          <label className="integration-enable-option"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} /><span><strong>Enable Brevo after verification</strong></span></label>
          {inlineError && <div className="integration-inline-error" role="alert"><WarningCircle weight="fill" /> {inlineError}</div>}
          <button className="admin-primary integration-connect-button" disabled={busy === "connect"} type="submit">{busy === "connect" ? "Verifying with Brevo…" : "Connect & verify"}<ArrowRight /></button>
          <SecurityNote><strong>Your Brevo key stays on the server.</strong> Authenticate findra.ph in Brevo, then save the sender address here.</SecurityNote>
        </form>
      </div>
    </section>
  );
}

function GoogleMapsIntegration({ onNotify }) {
  const { status, busy, setBusy, inlineError, setInlineError, apply, refresh } = useIntegration("/api/maps/integration", { configured: false, keyHint: "", provider: "Google Maps Platform", source: "not configured" });
  const [apiKey, setApiKey] = useState("");
  const connect = async (event) => {
    event.preventDefault();
    setBusy("connect");
    setInlineError("");
    try {
      await apply(await fetch("/api/maps/integration/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey, enabled: true }) }));
      setApiKey("");
      onNotify?.({ type: "success", title: "Google Maps connected", message: "Address search and listing maps can use this key." });
    } catch (error) {
      setInlineError(error.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <section className="panel maps-integration-card">
      <header>
        <div className="integration-provider-icon"><MapPin weight="duotone" /></div>
        <div><span>LOCATION SERVICES</span><h3>Google Maps</h3><p>Address search for listing forms and public profile maps.</p></div>
        <span className={`integration-status-pill ${status.configured ? "connected" : "inactive"}`}><i />{busy === "refresh" || status.loading ? "Checking" : status.configured ? "Connected" : "Setup required"}</span>
      </header>
      <div className="integration-summary">
        <div><span>Provider</span><strong>{status.provider}</strong></div>
        <div><span>API key</span><strong>{status.keyHint || "Not configured"}</strong></div>
        <div><span>Saved in</span><strong>{status.source || "not configured"}</strong></div>
      </div>
      <form className="integration-inline-form" onSubmit={connect}>
        <label>
          <FieldLabel required={!status.keyHint}>Google Maps API key</FieldLabel>
          <input required={!status.keyHint} type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={status.keyHint ? "AIza•••• (saved — paste to replace)" : "AIza••••••••••••••••"} />
          <small>In Google Cloud, restrict this browser key to findra.ph, www.findra.ph, and staging.findra.ph. Enable Maps JavaScript API, Places API, and Maps Embed API.</small>
        </label>
        {inlineError && <div className="integration-inline-error" role="alert"><WarningCircle weight="fill" /> {inlineError}</div>}
        <footer>
          <button type="button" className="secondary-button" onClick={refresh} disabled={status.loading}>{status.loading ? "Checking…" : "Refresh status"}</button>
          <button className="admin-primary" disabled={busy === "connect"} type="submit">{busy === "connect" ? "Saving…" : "Save Maps key"}</button>
          <a className="admin-primary" href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noreferrer">Open Google Cloud <ArrowRight /></a>
        </footer>
      </form>
    </section>
  );
}

function R2Integration({ onNotify }) {
  const { status, busy, setBusy, inlineError, setInlineError, apply, refresh } = useIntegration("/api/r2/integration", {
    configured: false, enabled: false, bucketName: "", endpoint: "", accountHint: "", keyHint: "", source: "not configured",
  });
  const [form, setForm] = useState({ accountId: "", accessKeyId: "", secretAccessKey: "", bucketName: "", endpoint: "", enabled: true });
  useEffect(() => {
    if (!status.loading) setForm((current) => ({ ...current, bucketName: status.bucketName || current.bucketName, endpoint: status.endpoint || current.endpoint, enabled: status.enabled !== false }));
  }, [status.loading, status.bucketName, status.endpoint, status.enabled]);
  const toggle = async () => {
    if (!status.bucketName && !status.configured) return setInlineError("Connect a bucket before enabling uploads.");
    const enabled = !status.enabled;
    setBusy("toggle");
    try {
      await apply(await fetch("/api/r2/integration", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) }));
      onNotify?.({ type: "success", title: enabled ? "R2 enabled" : "R2 disabled", message: enabled ? "Listing media uploads can use this bucket." : "New media uploads are paused." });
    } catch (error) {
      setInlineError(error.message);
    } finally {
      setBusy("");
    }
  };
  const connect = async (event) => {
    event.preventDefault();
    setBusy("connect");
    setInlineError("");
    try {
      await apply(await fetch("/api/r2/integration/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }));
      setForm((current) => ({ ...current, accessKeyId: "", secretAccessKey: "" }));
      onNotify?.({ type: "success", title: "Cloudflare R2 connected", message: `Findra verified bucket ${form.bucketName || status.bucketName}.` });
    } catch (error) {
      setInlineError(error.message);
      onNotify?.({ type: "error", title: "R2 could not be connected", message: error.message });
    } finally {
      setBusy("");
    }
  };
  return (
    <section className="integration-overview-grid r2-integration-section">
      <article className="panel paymongo-integration-card">
        <header>
          <div className="integration-provider-icon"><Cloud weight="duotone" /></div>
          <div><span>FILE STORAGE</span><h3>Cloudflare R2</h3><p>Logos, galleries, videos, and brochure uploads.</p></div>
          <button type="button" className={`integration-switch ${status.enabled ? "on" : ""}`} disabled={busy === "toggle" || status.loading} onClick={toggle}><i /></button>
        </header>
        <div className="integration-summary">
          <div><span>Bucket</span><strong>{status.bucketName || "Not connected"}</strong></div>
          <div><span>Access key</span><strong>{status.keyHint || "Not connected"}</strong></div>
          <div><span>Account</span><strong>{status.accountHint || "Not connected"}</strong></div>
        </div>
        <footer>
          <button type="button" className="secondary-button" disabled={busy === "refresh"} onClick={refresh}>{busy === "refresh" ? "Refreshing…" : "Refresh status"}</button>
          <a className="admin-primary" href="https://dash.cloudflare.com" target="_blank" rel="noreferrer">Open Cloudflare R2 <ArrowRight /></a>
        </footer>
      </article>
      <form className="panel integration-connect-card" onSubmit={connect}>
        <div className="integration-card-title"><div><Cloud weight="duotone" /></div><span><small>SECURE CONNECTION</small><strong>{status.configured ? "Update R2 credentials" : "Connect Cloudflare R2"}</strong></span></div>
        <label><FieldLabel required={!status.accountHint}>Account ID</FieldLabel><input required={!status.accountHint} value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })} placeholder={status.accountHint || "Cloudflare account ID"} /></label>
        <label><FieldLabel required={!status.keyHint}>Access key ID</FieldLabel><input required={!status.keyHint} autoComplete="off" value={form.accessKeyId} onChange={(event) => setForm({ ...form, accessKeyId: event.target.value })} placeholder={status.keyHint || "R2 access key ID"} /></label>
        <label><FieldLabel required={!status.keyHint}>Secret access key</FieldLabel><input required={!status.keyHint} type="password" autoComplete="off" value={form.secretAccessKey} onChange={(event) => setForm({ ...form, secretAccessKey: event.target.value })} placeholder="R2 secret access key" /></label>
        <label><FieldLabel required>Bucket name</FieldLabel><input required value={form.bucketName} onChange={(event) => setForm({ ...form, bucketName: event.target.value })} placeholder="findra-media" /></label>
        <label><FieldLabel>Endpoint</FieldLabel><input value={form.endpoint} onChange={(event) => setForm({ ...form, endpoint: event.target.value })} placeholder="https://ACCOUNT_ID.r2.cloudflarestorage.com" /><small>Leave blank to build it from the account ID.</small></label>
        {inlineError && <div className="integration-inline-error" role="alert"><WarningCircle weight="fill" /> {inlineError}</div>}
        <button className="admin-primary integration-connect-button" disabled={busy === "connect"} type="submit">{busy === "connect" ? "Verifying bucket…" : "Connect & verify"}<ArrowRight /></button>
        <SecurityNote><strong>R2 keys stay on the server.</strong> Findra checks that the bucket exists before saving.</SecurityNote>
      </form>
    </section>
  );
}

function TextBeeIntegration({ onNotify }) {
  const { status, busy, setBusy, inlineError, setInlineError, apply, refresh } = useIntegration("/api/textbee/integration", {
    configured: false, enabled: false, ready: false, deviceHint: "Not configured", source: "not configured",
  });
  const [form, setForm] = useState({ apiKey: "", deviceId: "", enabled: true });
  const connect = async (event) => {
    event.preventDefault();
    setBusy("connect");
    setInlineError("");
    try {
      await apply(await fetch("/api/textbee/integration/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }));
      setForm({ apiKey: "", deviceId: "", enabled: form.enabled });
      onNotify?.({ type: "success", title: "TextBee connected", message: "Findra can send branded SMS from automations." });
    } catch (error) {
      setInlineError(error.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <section className="panel maps-integration-card">
      <header>
        <div className="integration-provider-icon"><Phone weight="duotone" /></div>
        <div><span>SMS AUTOMATION</span><h3>TextBee</h3><p>Optional SMS alongside Brevo email for listing and account events.</p></div>
        <span className={`integration-status-pill ${status.ready ? "connected" : "inactive"}`}><i />{status.ready ? "Connected" : status.configured ? "Paused" : "Setup required"}</span>
      </header>
      <div className="integration-summary">
        <div><span>Device</span><strong>{status.deviceHint}</strong></div>
        <div><span>Status</span><strong>{status.ready ? "Ready" : status.configured ? "Configured" : "Not configured"}</strong></div>
        <div><span>Saved in</span><strong>{status.source || "not configured"}</strong></div>
      </div>
      <form className="integration-inline-form" onSubmit={connect}>
        <label><FieldLabel required={!status.configured}>API key</FieldLabel><input required={!status.configured} type="password" autoComplete="off" value={form.apiKey} onChange={(event) => setForm({ ...form, apiKey: event.target.value })} placeholder="TextBee API key" /></label>
        <label><FieldLabel required={!status.configured}>Device ID</FieldLabel><input required={!status.configured} value={form.deviceId} onChange={(event) => setForm({ ...form, deviceId: event.target.value })} placeholder="Gateway device ID" /></label>
        <label className="integration-enable-option"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} /><span><strong>Enable SMS after saving</strong></span></label>
        {inlineError && <div className="integration-inline-error" role="alert"><WarningCircle weight="fill" /> {inlineError}</div>}
        <footer>
          <button type="button" className="secondary-button" onClick={refresh}>Refresh status</button>
          <button className="admin-primary" disabled={busy === "connect"} type="submit">{busy === "connect" ? "Saving…" : "Save TextBee"}</button>
        </footer>
      </form>
    </section>
  );
}
