import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  BellRinging,
  CheckCircle,
  ClockCounterClockwise,
  CreditCard,
  DotsThree,
  EnvelopeSimple,
  FileText,
  Package,
  PencilSimple,
  Plus,
  Tag,
  Trash,
  UserCircle,
  UsersThree,
  Wrench,
  X,
} from "@phosphor-icons/react";

const usersKey = "findra-admin-users-v1";
const packagesKey = "findra-packages-v2";
const taxonomyKey = "findra-taxonomy-v1";
const notificationsKey = "findra-notification-rules-v1";
const systemMessagesKey = "findra-system-messages-v1";
const notificationLogsKey = "findra-notification-logs-v1";
const mailSettingsKey = "findra-mail-settings-v1";
const customFieldsKey = "findra-custom-fields-v1";

const seedUsers = [
  {
    id: 1,
    name: "Ina de la Cruz",
    email: "eventsbyina",
    role: "Business owner",
    status: "Active",
    plan: "Business",
    joined: "Jul 16, 2026",
  },
  {
    id: 2,
    name: "Rand Macion",
    email: "rand@aifunnels.ph",
    role: "Business owner",
    status: "Active",
    plan: "Featured",
    joined: "Jul 15, 2026",
  },
  {
    id: 3,
    name: "Mara Santos",
    email: "mara@mnlcraft.ph",
    role: "Business owner",
    status: "Pending",
    plan: "Business",
    joined: "Jul 18, 2026",
  },
  {
    id: 4,
    name: "Luis Reyes",
    email: "luis@northsouth.ph",
    role: "Member",
    status: "Active",
    plan: "Free",
    joined: "Jul 12, 2026",
  },
  {
    id: 5,
    name: "Carla Dizon",
    email: "carla@bayanihan.ph",
    role: "Business owner",
    status: "Suspended",
    plan: "Free",
    joined: "Jul 9, 2026",
  },
];

const seedPackages = [
  {
    id: 1,
    name: "Findra Business Listing",
    price: 999,
    interval: "Yearly",
    status: "Active",
    subscribers: 54,
    featured: true,
    features: [
      "Published business listing",
      "Logo, gallery, video, and attachments",
      "Customer inquiry and direct contact tools",
      "Business-owner dashboard access",
    ],
  },
];

const seedTaxonomy = {
  categories: [
    {
      id: 1,
      name: "Products & Suppliers",
      description:
        "Manufacturers, wholesalers, suppliers, and product sellers.",
      status: "Active",
    },
    {
      id: 2,
      name: "Services & Rentals",
      description:
        "Business services, venues, equipment, and rental providers.",
      status: "Active",
    },
    {
      id: 3,
      name: "Professionals",
      description: "Licensed and independent professional expertise.",
      status: "Active",
    },
    {
      id: 4,
      name: "Freelancers & Creatives",
      description: "Creative, marketing, technology, and project talent.",
      status: "Active",
    },
    {
      id: 5,
      name: "Community & Institutions",
      description: "Schools, associations, training centers, and communities.",
      status: "Active",
    },
  ],
  services: [
    {
      id: 1,
      name: "Full Coordination",
      description: "End-to-end project or event coordination.",
      status: "Active",
    },
    {
      id: 2,
      name: "Graphic Design",
      description: "Brand and visual communication services.",
      status: "Active",
    },
    {
      id: 3,
      name: "Equipment Rental",
      description: "Commercial and event equipment rental.",
      status: "Active",
    },
    {
      id: 4,
      name: "Photography",
      description: "Commercial, event, and product photography.",
      status: "Active",
    },
    {
      id: 5,
      name: "Training",
      description: "Professional workshops and training programs.",
      status: "Active",
    },
    {
      id: 6,
      name: "Web & App Development",
      description: "Websites, applications, and software solutions.",
      status: "Active",
    },
  ],
};

const triggerOptions = [
  ["new-user", "New user welcome"],
  ["listing-submitted", "Business listing submitted"],
  ["listing-pending-admin", "Listing pending moderator review"],
  ["listing-approved", "Business listing approved"],
  ["listing-declined", "Business listing declined"],
  ["subscription-started", "Subscription payment successful"],
  ["subscription-failed", "Subscription payment failed"],
  ["listing-expiring", "Business listing expiring soon"],
  ["listing-expired", "Business listing expired"],
  ["inquiry-received", "New inquiry received"],
];

const seedNotificationRules = [
  [1, "New user welcome", "new-user", "Email", true],
  [2, "Business submitted — pending review", "listing-submitted", "Email", true],
  [3, "Business approved — now live", "listing-approved", "Email", true],
  [4, "Business declined — action required", "listing-declined", "Email", true],
  [5, "Subscription started — payment successful", "subscription-started", "Email", true],
  [6, "Subscription payment failed", "subscription-failed", "Email", true],
  [7, "Business listing expiring soon", "listing-expiring", "Email", true],
  [8, "Business listing expired", "listing-expired", "Email", true],
  [9, "New inquiry received — supplier alert", "inquiry-received", "Email", true],
  [10, "New business pending review — admin", "listing-pending-admin", "Email", true],
].map(([id, name, trigger, channel, active]) => ({ id, name, trigger, channel, active }));

const seedSystemMessages = [
  {
    id: "confirmation",
    name: "Confirmation email",
    description: "Sent to new users so they can verify their email address.",
    variables: ["{userDisplayName}", "{confirmationUrl}"],
    subject: "Confirm your email address",
    body: "Hi {userDisplayName},\n\nWelcome to Findra PH! Confirm your email address to activate your account:\n{confirmationUrl}",
  },
  {
    id: "reset-password",
    name: "Reset password",
    description: "Sent when a user requests a password reset.",
    variables: ["{userDisplayName}", "{resetPasswordUrl}"],
    subject: "Reset your Findra password",
    body: "Hi {userDisplayName},\n\nWe received a request to reset your Findra PH password. Use this secure link:\n{resetPasswordUrl}",
  },
  {
    id: "change-email",
    name: "Change email",
    description: "Sent when a user changes the email address on their account.",
    variables: ["{userDisplayName}", "{changeEmailUrl}"],
    subject: "Confirm your email address change",
    body: "Hi {userDisplayName},\n\nYou requested to change the email address associated with your Findra PH account. Confirm the change here:\n{changeEmailUrl}",
  },
];

const seedNotificationLogs = [
  { id: 1, event: "Business listing approved", recipient: "eventsbyina", status: "Delivered", sentAt: "Jul 18, 2026 · 10:42 AM" },
  { id: 2, event: "New user welcome", recipient: "mara@mnlcraft.ph", status: "Delivered", sentAt: "Jul 18, 2026 · 9:18 AM" },
  { id: 3, event: "Subscription payment failed", recipient: "carla@bayanihan.ph", status: "Failed", sentAt: "Jul 17, 2026 · 5:09 PM" },
  { id: 4, event: "New inquiry received", recipient: "hello@eventsbyina.ph", status: "Delivered", sentAt: "Jul 17, 2026 · 2:31 PM" },
];

const seedMailSettings = {
  fromName: "Findra PH",
  fromEmail: "hello@findra.ph",
  replyTo: "hello@findra.ph",
  footer: "You are receiving this email because you have a Findra PH account or business listing. © 2026 Findra PH.",
};

const seedCustomFields = [
  [1, "Business Category", "business-category", "Taxonomy", "Business details", true],
  [2, "Business Services", "business-services", "Taxonomy", "Business details", true],
  [3, "Business Type", "business-type", "Taxonomy", "Business details", true],
  [4, "Tagline", "tagline", "Text", "Business details", true],
  [5, "Business Email Address", "business-email", "Email", "Contact & location", true],
  [6, "Business Phone", "business-phone", "Phone", "Contact & location", true],
  [7, "Website / Social Page", "business-website", "URL", "Contact & location", true],
  [8, "Business Logo", "business-logo", "Image", "Media & review", true],
  [9, "Featured Image", "featured-image", "Image", "Media & review", true],
  [10, "Business Gallery", "business-gallery", "Gallery", "Media & review", true],
  [11, "Attachments", "attachments", "Files", "Media & review", true],
  [12, "Featured Video", "featured-video", "Embed", "Media & review", true],
  [13, "Business Address", "business-address", "Location", "Contact & location", true],
].map(([id, name, slug, type, section, builtin], order) => ({
  id, name, slug, type, section, builtin, order, required: false,
  status: "Active", placeholder: "", options: [],
  visibility: { listingForm: true, publicProfile: true, adminDashboard: true },
}));

function readStored(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value || fallback;
  } catch {
    return fallback;
  }
}

function saveStored(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function readManagedTaxonomy() {
  const value = readStored(taxonomyKey, seedTaxonomy);
  return {
    categories: (value.categories || seedTaxonomy.categories).filter(
      (item) => item.status !== "Inactive",
    ),
    services: (value.services || seedTaxonomy.services).filter(
      (item) => item.status !== "Inactive",
    ),
  };
}

export function readCustomFields() {
  return readStored(customFieldsKey, seedCustomFields)
    .filter(
      (field) =>
        !field.builtin &&
        field.status === "Active" &&
        field.visibility?.listingForm !== false,
    )
    .sort((a, b) => a.order - b.order);
}

export function recordNotificationEvent(trigger, detail = {}) {
  const rules = readStored(notificationsKey, seedNotificationRules);
  const activeRules = rules.filter((rule) => rule.active && rule.trigger === trigger);
  if (!activeRules.length) return;
  const logs = readStored(notificationLogsKey, seedNotificationLogs);
  const created = activeRules.map((rule, index) => ({
    id: Date.now() + index,
    event: rule.name,
    recipient: detail.recipient || "Findra account holder",
    status: "Delivered",
    sentAt: new Intl.DateTimeFormat("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    }).format(new Date()),
  }));
  saveStored(notificationLogsKey, [...created, ...logs].slice(0, 100));
}

function ModuleHeader({ eyebrow, title, copy, action, actionLabel }) {
  return (
    <section className="welcome-row management-welcome">
      <div>
        <span className="section-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
      <button className="admin-primary" onClick={action}>
        <Plus /> {actionLabel}
      </button>
    </section>
  );
}

function ManagementModal({ title, eyebrow, close, children }) {
  return (
    <div className="management-modal-backdrop" onMouseDown={close}>
      <section
        className="management-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span>{eyebrow}</span>
            <h2>{title}</h2>
          </div>
          <button type="button" aria-label="Close editor" onClick={close}>
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function UserEditor({ item, close, save }) {
  const [form, setForm] = useState(
    item || {
      name: "",
      email: "",
      password: "",
      role: "Business owner",
      status: "Active",
      plan: "Free",
    },
  );
  const change = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  return (
    <ManagementModal
      eyebrow="User management"
      title={item ? "Edit user" : "Add user"}
      close={close}
    >
      <form
        className="management-editor-form"
        onSubmit={(event) => {
          event.preventDefault();
          save(form);
        }}
      >
        <div className="management-form-grid">
          <label>
            <span>Full name *</span>
            <input
              required
              value={form.name}
              onChange={change("name")}
              placeholder="Business owner or member"
            />
          </label>
          <label>
            <span>Email or username *</span>
            <input
              required
              value={form.email}
              onChange={change("email")}
              placeholder="owner@business.com"
            />
          </label>
          <label>
            <span>Role</span>
            <select value={form.role} onChange={change("role")}>
              <option>Business owner</option>
              <option>Member</option>
              <option>Administrator</option>
            </select>
          </label>
          <label>
            <span>Account status</span>
            <select value={form.status} onChange={change("status")}>
              <option>Active</option>
              <option>Pending</option>
              <option>Suspended</option>
            </select>
          </label>
          <label>
            <span>Subscription package</span>
            <select value={form.plan} onChange={change("plan")}>
              <option>Free</option>
              <option>Business</option>
              <option>Featured</option>
            </select>
          </label>
          <label>
            <span>
              {item ? "Replace password (optional)" : "Temporary password *"}
            </span>
            <input
              required={!item}
              type="password"
              value={form.password || ""}
              onChange={change("password")}
              placeholder="At least 8 characters"
              minLength={item ? undefined : 8}
            />
          </label>
        </div>
        <footer>
          <button type="button" className="secondary-button" onClick={close}>
            Cancel
          </button>
          <button className="admin-primary" type="submit">
            <CheckCircle /> {item ? "Save changes" : "Create user"}
          </button>
        </footer>
      </form>
    </ManagementModal>
  );
}

export function UsersManagement({ query = "", onNotify }) {
  const [users, setUsers] = useState(() => readStored(usersKey, seedUsers));
  const [filter, setFilter] = useState("All");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const filtered = useMemo(
    () =>
      users.filter(
        (user) =>
          (filter === "All" || user.status === filter) &&
          `${user.name} ${user.email} ${user.role} ${user.plan}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [filter, query, users],
  );
  const commit = (next) => {
    setUsers(next);
    saveStored(usersKey, next);
  };
  const save = (record) => {
    const nextRecord = {
      ...record,
      id: record.id || Math.max(0, ...users.map((user) => user.id)) + 1,
      joined:
        record.joined ||
        new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
    };
    commit(
      record.id
        ? users.map((user) => (user.id === record.id ? nextRecord : user))
        : [nextRecord, ...users],
    );
    const accounts = readStored("findra-custom-accounts", []);
    const accountRecord = {
      name: nextRecord.name,
      username: nextRecord.email.toLowerCase(),
      password:
        nextRecord.password ||
        accounts.find(
          (account) => account.username === nextRecord.email.toLowerCase(),
        )?.password ||
        "",
      role: nextRecord.role === "Administrator" ? "admin" : "user",
      status: nextRecord.status,
    };
    const otherAccounts = accounts.filter(
      (account) => account.username !== accountRecord.username,
    );
    saveStored("findra-custom-accounts", [...otherAccounts, accountRecord]);
    setEditing(null);
    setCreating(false);
    onNotify?.({
      type: "success",
      title: record.id ? "User updated" : "User created",
      message: `${nextRecord.name}'s account details are now up to date.`,
    });
  };
  const remove = (user) => {
    if (!window.confirm(`Delete ${user.name}'s account?`)) return;
    commit(users.filter((item) => item.id !== user.id));
    onNotify?.({
      type: "success",
      title: "User deleted",
      message: `${user.name} was removed from Findra.`,
    });
  };
  const active = users.filter((user) => user.status === "Active").length;
  const owners = users.filter((user) => user.role === "Business owner").length;
  return (
    <div className="admin-content management-module">
      <ModuleHeader
        eyebrow="Accounts & access"
        title="Users management"
        copy="Create accounts, manage access, assign packages, and review member status."
        action={() => setCreating(true)}
        actionLabel="Add user"
      />
      <section className="management-metrics">
        <article>
          <UsersThree />
          <span>
            <small>Total users</small>
            <strong>{users.length}</strong>
          </span>
        </article>
        <article>
          <CheckCircle />
          <span>
            <small>Active</small>
            <strong>{active}</strong>
          </span>
        </article>
        <article>
          <UserCircle />
          <span>
            <small>Business owners</small>
            <strong>{owners}</strong>
          </span>
        </article>
      </section>
      <section className="panel management-table-panel">
        <header className="management-table-tools">
          <div>
            <h3>All users</h3>
            <p>{filtered.length} accounts shown</p>
          </div>
          <div className="management-filter-tabs">
            {["All", "Active", "Pending", "Suspended"].map((status) => (
              <button
                className={filter === status ? "active" : ""}
                onClick={() => setFilter(status)}
                key={status}
              >
                {status}
              </button>
            ))}
          </div>
        </header>
        <div className="management-table-scroll">
          <table className="management-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Package</th>
                <th>Status</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="management-primary-cell">
                      <i>
                        {user.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)}
                      </i>
                      <span>
                        <strong>{user.name}</strong>
                        <small>{user.email}</small>
                      </span>
                    </div>
                  </td>
                  <td>{user.role}</td>
                  <td>
                    <span className="management-plan">{user.plan}</span>
                  </td>
                  <td>
                    <span
                      className={`management-status ${user.status.toLowerCase()}`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td>{user.joined}</td>
                  <td>
                    <div className="management-row-actions">
                      <button
                        aria-label={`Edit ${user.name}`}
                        onClick={() => setEditing(user)}
                      >
                        <PencilSimple />
                      </button>
                      <button
                        aria-label={`Delete ${user.name}`}
                        onClick={() => remove(user)}
                      >
                        <Trash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {(creating || editing) && (
        <UserEditor
          item={editing}
          close={() => {
            setCreating(false);
            setEditing(null);
          }}
          save={save}
        />
      )}
    </div>
  );
}

function PackageEditor({ item, close, save }) {
  const [form, setForm] = useState(
    item || {
      name: "",
      price: 999,
      interval: "Yearly",
      status: "Active",
      featured: false,
      features: [],
    },
  );
  const [features, setFeatures] = useState((form.features || []).join("\n"));
  const change = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  return (
    <ManagementModal
      eyebrow="Packages & billing"
      title={item ? "Edit package" : "Create package"}
      close={close}
    >
      <form
        className="management-editor-form"
        onSubmit={(event) => {
          event.preventDefault();
          save({
            ...form,
            price: Number(form.price),
            features: features
              .split("\n")
              .map((value) => value.trim())
              .filter(Boolean),
          });
        }}
      >
        <div className="management-form-grid">
          <label>
            <span>Package name *</span>
            <input
              required
              value={form.name}
              onChange={change("name")}
              placeholder="Business"
            />
          </label>
          <label>
            <span>Price (PHP) *</span>
            <input
              required
              min="0"
              type="number"
              value={form.price}
              onChange={change("price")}
            />
          </label>
          <label>
            <span>Billing interval</span>
            <select value={form.interval} onChange={change("interval")}>
              <option>Monthly</option>
              <option>Yearly</option>
              <option>Forever</option>
            </select>
          </label>
          <label>
            <span>Status</span>
            <select value={form.status} onChange={change("status")}>
              <option>Active</option>
              <option>Archived</option>
            </select>
          </label>
          <label className="management-wide-field">
            <span>Features (one per line)</span>
            <textarea
              rows="5"
              value={features}
              onChange={(event) => setFeatures(event.target.value)}
              placeholder={
                "Published business listing\nGallery and video\nInquiry form"
              }
            />
          </label>
          <label className="management-checkbox-field">
            <input
              type="checkbox"
              checked={Boolean(form.featured)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  featured: event.target.checked,
                }))
              }
            />
            <span>Mark as recommended package</span>
          </label>
        </div>
        <footer>
          <button type="button" className="secondary-button" onClick={close}>
            Cancel
          </button>
          <button className="admin-primary" type="submit">
            <CheckCircle /> Save package
          </button>
        </footer>
      </form>
    </ManagementModal>
  );
}

export function SubscriptionsManagement({ onNotify }) {
  const [packages, setPackages] = useState(() =>
    readStored(packagesKey, seedPackages),
  );
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    fetch("/api/packages?admin=true", { credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (payload?.packages) setPackages(payload.packages); })
      .catch(() => {});
  }, []);
  const commit = (next) => {
    setPackages(next);
    saveStored(packagesKey, next);
  };
  const save = async (record) => {
    const nextRecord = {
      ...record,
      id: record.id || Math.max(0, ...packages.map((item) => item.id)) + 1,
      subscribers: record.subscribers || 0,
    };
    try {
      const response = await fetch(record.id ? `/api/packages/${record.id}` : "/api/packages", {
        method: record.id ? "PATCH" : "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(nextRecord),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      commit(record.id ? packages.map((item) => item.id === record.id ? payload.package : item) : [...packages, payload.package]);
    } catch (error) {
      onNotify?.({ type: "error", title: "Package save failed", message: error.message || "Please try again." });
      return;
    }
    setEditing(null);
    setCreating(false);
    onNotify?.({
      type: "success",
      title: "Package saved",
      message: `${nextRecord.name} is ready for subscription assignment.`,
    });
  };
  const remove = (item) => {
    if (item.subscribers > 0) {
      onNotify?.({
        type: "error",
        title: "Package is in use",
        message: "Move active subscribers before deleting this package.",
      });
      return;
    }
    if (!window.confirm(`Delete the ${item.name} package?`)) return;
    commit(packages.filter((entry) => entry.id !== item.id));
  };
  const activeSubscribers = packages.reduce(
    (sum, item) => sum + Number(item.subscribers || 0),
    0,
  );
  const annualRevenue = packages.reduce(
    (sum, item) =>
      sum +
      Number(item.price || 0) *
        Number(item.subscribers || 0) *
        (item.interval === "Monthly" ? 12 : 1),
    0,
  );
  return (
    <div className="admin-content management-module">
      <ModuleHeader
        eyebrow="Packages & billing"
        title="Subscriptions"
        copy="Create packages, update pricing and benefits, and monitor plan adoption."
        action={() => setCreating(true)}
        actionLabel="Create package"
      />
      <section className="management-metrics">
        <article>
          <Package />
          <span>
            <small>Active packages</small>
            <strong>
              {packages.filter((item) => item.status === "Active").length}
            </strong>
          </span>
        </article>
        <article>
          <UsersThree />
          <span>
            <small>Subscribers</small>
            <strong>{activeSubscribers}</strong>
          </span>
        </article>
        <article>
          <CreditCard />
          <span>
            <small>Projected annual value</small>
            <strong>₱{annualRevenue.toLocaleString()}</strong>
          </span>
        </article>
      </section>
      <section className="package-management-grid">
        {packages.map((item) => (
          <article
            className={`panel package-management-card ${item.featured ? "featured" : ""}`}
            key={item.id}
          >
            {item.featured && (
              <span className="package-recommended">Recommended</span>
            )}
            <header>
              <div>
                <small>{item.status}</small>
                <h3>{item.name}</h3>
              </div>
              <button
                aria-label={`Edit ${item.name} package`}
                onClick={() => setEditing(item)}
              >
                <PencilSimple />
              </button>
            </header>
            <div className="package-price">
              <strong>₱{Number(item.price).toLocaleString()}</strong>
              <span>/ {item.interval.toLowerCase()}</span>
            </div>
            <p>{item.subscribers} current subscribers</p>
            <ul>
              {item.features.map((feature) => (
                <li key={feature}>
                  <CheckCircle weight="fill" /> {feature}
                </li>
              ))}
            </ul>
            <footer>
              <button
                className="secondary-button"
                onClick={() => setEditing(item)}
              >
                Edit package
              </button>
              <button
                className="management-delete-button"
                onClick={() => remove(item)}
              >
                <Trash /> Delete
              </button>
            </footer>
          </article>
        ))}
      </section>
      {(creating || editing) && (
        <PackageEditor
          item={editing}
          close={() => {
            setCreating(false);
            setEditing(null);
          }}
          save={save}
        />
      )}
    </div>
  );
}

function TaxonomyEditor({ item, type, close, save }) {
  const [form, setForm] = useState(
    item || { name: "", description: "", status: "Active" },
  );
  return (
    <ManagementModal
      eyebrow="Directory taxonomy"
      title={`${item ? "Edit" : "Add"} ${type === "categories" ? "category" : "service"}`}
      close={close}
    >
      <form
        className="management-editor-form"
        onSubmit={(event) => {
          event.preventDefault();
          save(form);
        }}
      >
        <div className="management-form-grid">
          <label>
            <span>Name *</span>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder={
                type === "categories" ? "New business category" : "New service"
              }
            />
          </label>
          <label>
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </label>
          <label className="management-wide-field">
            <span>Description</span>
            <textarea
              rows="4"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Explain when businesses should choose this option."
            />
          </label>
        </div>
        <footer>
          <button type="button" className="secondary-button" onClick={close}>
            Cancel
          </button>
          <button className="admin-primary" type="submit">
            <CheckCircle /> Save
          </button>
        </footer>
      </form>
    </ManagementModal>
  );
}

export function TaxonomyManagement({ query = "", onNotify }) {
  const [taxonomy, setTaxonomy] = useState(() =>
    readStored(taxonomyKey, seedTaxonomy),
  );
  const [type, setType] = useState("categories");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const rows = (taxonomy[type] || []).filter((item) =>
    `${item.name} ${item.description}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const commit = (next) => {
    setTaxonomy(next);
    saveStored(taxonomyKey, next);
  };
  const save = (record) => {
    const current = taxonomy[type] || [];
    const nextRecord = {
      ...record,
      id: record.id || Math.max(0, ...current.map((item) => item.id)) + 1,
    };
    commit({
      ...taxonomy,
      [type]: record.id
        ? current.map((item) => (item.id === record.id ? nextRecord : item))
        : [...current, nextRecord],
    });
    setEditing(null);
    setCreating(false);
    onNotify?.({
      type: "success",
      title: type === "categories" ? "Category saved" : "Service saved",
      message: `${nextRecord.name} is now available in business listing forms.`,
    });
  };
  const remove = (item) => {
    if (
      !window.confirm(
        `Delete ${item.name}? Existing listings keep their saved value.`,
      )
    )
      return;
    commit({
      ...taxonomy,
      [type]: taxonomy[type].filter((entry) => entry.id !== item.id),
    });
  };
  return (
    <div className="admin-content management-module">
      <ModuleHeader
        eyebrow="Directory taxonomy"
        title="Categories & services"
        copy="Control the options businesses can select when creating or editing a listing."
        action={() => setCreating(true)}
        actionLabel={type === "categories" ? "Add category" : "Add service"}
      />
      <section className="management-metrics">
        <article>
          <Tag />
          <span>
            <small>Categories</small>
            <strong>{taxonomy.categories.length}</strong>
          </span>
        </article>
        <article>
          <Wrench />
          <span>
            <small>Services</small>
            <strong>{taxonomy.services.length}</strong>
          </span>
        </article>
        <article>
          <CheckCircle />
          <span>
            <small>Active options</small>
            <strong>
              {
                [...taxonomy.categories, ...taxonomy.services].filter(
                  (item) => item.status === "Active",
                ).length
              }
            </strong>
          </span>
        </article>
      </section>
      <section className="panel taxonomy-panel">
        <header className="management-table-tools">
          <div className="management-filter-tabs taxonomy-tabs">
            <button
              className={type === "categories" ? "active" : ""}
              onClick={() => setType("categories")}
            >
              <Tag /> Categories
            </button>
            <button
              className={type === "services" ? "active" : ""}
              onClick={() => setType("services")}
            >
              <Wrench /> Services
            </button>
          </div>
          <p>{rows.length} options shown</p>
        </header>
        <div className="taxonomy-list">
          {rows.map((item) => (
            <article key={item.id}>
              <div className={`taxonomy-icon ${type}`}>
                {type === "categories" ? <Tag /> : <Wrench />}
              </div>
              <div>
                <h3>{item.name}</h3>
                <p>{item.description || "No description added."}</p>
              </div>
              <span
                className={`management-status ${item.status.toLowerCase()}`}
              >
                {item.status}
              </span>
              <div className="management-row-actions">
                <button
                  aria-label={`Edit ${item.name}`}
                  onClick={() => setEditing(item)}
                >
                  <PencilSimple />
                </button>
                <button
                  aria-label={`Delete ${item.name}`}
                  onClick={() => remove(item)}
                >
                  <Trash />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      {(creating || editing) && (
        <TaxonomyEditor
          item={editing}
          type={type}
          close={() => {
            setCreating(false);
            setEditing(null);
          }}
          save={save}
        />
      )}
    </div>
  );
}

function NotificationRuleEditor({ item, close, save }) {
  const [form, setForm] = useState(
    item || { name: "", trigger: triggerOptions[0][0], channel: "Email", active: true },
  );
  return (
    <ManagementModal eyebrow="Notification automation" title={`${item ? "Edit" : "Add"} notification`} close={close}>
      <form className="management-editor-form" onSubmit={(event) => { event.preventDefault(); save(form); }}>
        <div className="management-form-grid">
          <label className="management-wide-field"><span>Notification name *</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Listing approved — now live" /></label>
          <label><span>Trigger *</span><select value={form.trigger} onChange={(event) => setForm({ ...form, trigger: event.target.value })}>{triggerOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label><span>Delivery channel</span><select value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })}><option>Email</option><option>Admin inbox</option></select></label>
          <label className="management-checkbox-field management-wide-field"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /><span><strong>Automation enabled</strong><small>Run this notification whenever its trigger occurs.</small></span></label>
        </div>
        <footer><button type="button" className="secondary-button" onClick={close}>Cancel</button><button className="admin-primary" type="submit"><CheckCircle /> Save notification</button></footer>
      </form>
    </ManagementModal>
  );
}

export function NotificationsManagement({ query = "", onNotify }) {
  const [tab, setTab] = useState("rules");
  const [rules, setRules] = useState(() => readStored(notificationsKey, seedNotificationRules));
  const [messages, setMessages] = useState(() => readStored(systemMessagesKey, seedSystemMessages));
  const [logs, setLogs] = useState(() => readStored(notificationLogsKey, seedNotificationLogs));
  const [mail, setMail] = useState(() => readStored(mailSettingsKey, seedMailSettings));
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const commitRules = (next) => { setRules(next); saveStored(notificationsKey, next); };
  const saveRule = (record) => {
    const nextRecord = { ...record, id: record.id || Math.max(0, ...rules.map((item) => item.id)) + 1 };
    commitRules(record.id ? rules.map((item) => item.id === record.id ? nextRecord : item) : [...rules, nextRecord]);
    setEditing(null); setCreating(false);
    onNotify?.({ type: "success", title: "Notification saved", message: `${nextRecord.name} is ready to run automatically.` });
  };
  const removeRule = (item) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    commitRules(rules.filter((rule) => rule.id !== item.id));
  };
  const filteredRules = rules.filter((rule) => `${rule.name} ${rule.trigger}`.toLowerCase().includes(query.toLowerCase()));
  const tabs = [["rules", "Automations", BellRinging], ["messages", "System messages", EnvelopeSimple], ["logs", "Delivery logs", ClockCounterClockwise], ["mail", "Mail settings", EnvelopeSimple]];
  return (
    <div className="admin-content management-module notification-module">
      <ModuleHeader eyebrow="Communication center" title="Notifications" copy="Automate account, listing, inquiry, and subscription emails from one workspace." action={() => { setTab("rules"); setCreating(true); }} actionLabel="Add notification" />
      <section className="notification-summary-grid">
        <article><Bell /><span><small>Active automations</small><strong>{rules.filter((rule) => rule.active).length}</strong></span></article>
        <article><EnvelopeSimple /><span><small>Delivered</small><strong>{logs.filter((log) => log.status === "Delivered").length}</strong></span></article>
        <article><ClockCounterClockwise /><span><small>Failed delivery</small><strong>{logs.filter((log) => log.status === "Failed").length}</strong></span></article>
      </section>
      <div className="management-section-tabs notification-tabs" role="tablist">
        {tabs.map(([value, label, Icon]) => <button type="button" role="tab" aria-selected={tab === value} className={tab === value ? "active" : ""} onClick={() => setTab(value)} key={value}><Icon />{label}</button>)}
      </div>
      {tab === "rules" && <section className="panel notification-panel">
        <header className="management-table-tools"><div><h3>Automation rules</h3><p>Each rule connects an event in Findra to a delivery channel.</p></div><span>{filteredRules.length} rules</span></header>
        <div className="management-table-scroll"><table className="management-table notification-table"><thead><tr><th>Name</th><th>Trigger</th><th>Channel</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filteredRules.map((rule) => <tr key={rule.id}><td><div className="management-primary-cell"><strong>{rule.name}</strong><small>Rule #{String(rule.id).padStart(2, "0")}</small></div></td><td>{triggerOptions.find(([value]) => value === rule.trigger)?.[1] || rule.trigger}</td><td><span className="notification-channel"><EnvelopeSimple />{rule.channel}</span></td><td><button className={`management-status ${rule.active ? "active" : "inactive"}`} onClick={() => commitRules(rules.map((item) => item.id === rule.id ? { ...item, active: !item.active } : item))}>{rule.active ? "Active" : "Paused"}</button></td><td><div className="management-row-actions"><button aria-label={`Edit ${rule.name}`} onClick={() => setEditing(rule)}><PencilSimple /></button><button aria-label={`Delete ${rule.name}`} onClick={() => removeRule(rule)}><Trash /></button></div></td></tr>)}</tbody></table></div>
      </section>}
      {tab === "messages" && <section className="system-message-stack">{messages.map((message) => <form className="panel system-message-card" key={message.id} onSubmit={(event) => { event.preventDefault(); saveStored(systemMessagesKey, messages); onNotify?.({ type: "success", title: `${message.name} saved`, message: "The updated system email is ready for the next delivery." }); }}><header><div><span className="section-eyebrow">System email</span><h3>{message.name}</h3><p>{message.description}</p></div><div className="message-variables">{message.variables.map((variable) => <code key={variable}>{variable}</code>)}</div></header><label><span>Subject line</span><input value={message.subject} onChange={(event) => setMessages(messages.map((item) => item.id === message.id ? { ...item, subject: event.target.value } : item))} /></label><label><span>Message body</span><textarea rows="6" value={message.body} onChange={(event) => setMessages(messages.map((item) => item.id === message.id ? { ...item, body: event.target.value } : item))} /></label><footer><button className="admin-primary" type="submit"><CheckCircle /> Save changes</button></footer></form>)}</section>}
      {tab === "logs" && <section className="panel notification-panel"><header className="management-table-tools"><div><h3>Delivery activity</h3><p>Recent notification attempts from Findra automations.</p></div><button className="secondary-button" onClick={() => { setLogs([]); saveStored(notificationLogsKey, []); }}>Clear log</button></header><div className="management-table-scroll"><table className="management-table"><thead><tr><th>Event</th><th>Recipient</th><th>Sent</th><th>Status</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td><strong>{log.event}</strong></td><td>{log.recipient}</td><td>{log.sentAt}</td><td><span className={`management-status ${log.status.toLowerCase()}`}>{log.status}</span></td></tr>)}</tbody></table>{!logs.length && <div className="management-empty-state">No delivery activity yet.</div>}</div></section>}
      {tab === "mail" && <form className="panel mail-settings-card" onSubmit={(event) => { event.preventDefault(); saveStored(mailSettingsKey, mail); onNotify?.({ type: "success", title: "Mail settings saved", message: "Future system emails will use the updated sender identity and footer." }); }}><header><span className="section-eyebrow">Default sender</span><h3>Mail identity & footer</h3><p>These defaults apply to every Findra system email delivered through your connected provider.</p></header><div className="management-form-grid"><label><span>Sender name *</span><input required value={mail.fromName} onChange={(event) => setMail({ ...mail, fromName: event.target.value })} /></label><label><span>Sender email *</span><input required type="email" value={mail.fromEmail} onChange={(event) => setMail({ ...mail, fromEmail: event.target.value })} /></label><label className="management-wide-field"><span>Reply-to address</span><input type="email" value={mail.replyTo} onChange={(event) => setMail({ ...mail, replyTo: event.target.value })} /></label><label className="management-wide-field"><span>Mail footer</span><textarea rows="5" value={mail.footer} onChange={(event) => setMail({ ...mail, footer: event.target.value })} /></label></div><footer><button className="admin-primary" type="submit"><CheckCircle /> Save mail settings</button></footer></form>}
      {(creating || editing) && <NotificationRuleEditor item={editing} close={() => { setCreating(false); setEditing(null); }} save={saveRule} />}
    </div>
  );
}

const fieldTypes = ["Text", "Textarea", "Number", "Email", "Phone", "URL", "Select", "Checkbox", "Date"];

function slugify(value) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function CustomFieldEditor({ item, close, save }) {
  const [form, setForm] = useState(item || { name: "", slug: "", type: "Text", section: "Business details", required: false, status: "Active", placeholder: "", options: [], visibility: { listingForm: true, publicProfile: true, adminDashboard: true } });
  const setVisibility = (key, value) => setForm({ ...form, visibility: { ...form.visibility, [key]: value } });
  return <ManagementModal eyebrow="Listing form builder" title={`${item ? "Edit" : "Add"} custom field`} close={close}><form className="management-editor-form" onSubmit={(event) => { event.preventDefault(); save({ ...form, slug: form.slug || slugify(form.name) }); }}><div className="management-form-grid"><label><span>Field name *</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value, slug: item ? form.slug : slugify(event.target.value) })} placeholder="e.g. Years in business" /></label><label><span>Field slug *</span><input required value={form.slug} onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })} placeholder="years-in-business" /></label><label><span>Field type</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{fieldTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label><span>Form section</span><select value={form.section} onChange={(event) => setForm({ ...form, section: event.target.value })}><option>Business details</option><option>Contact & location</option><option>Media & review</option></select></label><label className="management-wide-field"><span>Placeholder / helper text</span><input value={form.placeholder} onChange={(event) => setForm({ ...form, placeholder: event.target.value })} placeholder="What should the business enter?" /></label>{form.type === "Select" && <label className="management-wide-field"><span>Select options</span><input value={(form.options || []).join(", ")} onChange={(event) => setForm({ ...form, options: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} placeholder="Option one, Option two, Option three" /></label>}<label><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Active</option><option>Inactive</option></select></label><label className="management-checkbox-field"><input type="checkbox" checked={form.required} onChange={(event) => setForm({ ...form, required: event.target.checked })} /><span><strong>Required field</strong><small>Businesses must complete it to continue.</small></span></label><fieldset className="field-visibility-options management-wide-field"><legend>Visibility</legend>{[["listingForm", "Listing form"], ["publicProfile", "Public listing"], ["adminDashboard", "Admin dashboard"]].map(([key, label]) => <label key={key}><input type="checkbox" checked={form.visibility?.[key] !== false} onChange={(event) => setVisibility(key, event.target.checked)} /><span>{label}</span></label>)}</fieldset></div><footer><button type="button" className="secondary-button" onClick={close}>Cancel</button><button className="admin-primary" type="submit"><CheckCircle /> Save field</button></footer></form></ManagementModal>;
}

export function CustomFieldsManagement({ query = "", onNotify }) {
  const [fields, setFields] = useState(() => readStored(customFieldsKey, seedCustomFields));
  const [section, setSection] = useState("All sections");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [checker, setChecker] = useState("");
  const commit = (next) => { const ordered = next.map((field, order) => ({ ...field, order })); setFields(ordered); saveStored(customFieldsKey, ordered); };
  const save = (record) => {
    const nextRecord = { ...record, id: record.id || Math.max(0, ...fields.map((field) => field.id)) + 1, builtin: Boolean(record.builtin), order: record.order ?? fields.length };
    commit(record.id ? fields.map((field) => field.id === record.id ? nextRecord : field) : [...fields, nextRecord]);
    setEditing(null); setCreating(false);
    onNotify?.({ type: "success", title: "Custom field saved", message: `${nextRecord.name} is now connected to the ${nextRecord.section.toLowerCase()} step.` });
  };
  const move = (item, direction) => { const index = fields.findIndex((field) => field.id === item.id); const target = index + direction; if (target < 0 || target >= fields.length) return; const next = [...fields]; [next[index], next[target]] = [next[target], next[index]]; commit(next); };
  const remove = (item) => { if (item.builtin || !window.confirm(`Delete ${item.name}? Saved listing values will be preserved.`)) return; commit(fields.filter((field) => field.id !== item.id)); };
  const rows = fields.filter((field) => (section === "All sections" || field.section === section) && `${field.name} ${field.slug} ${field.type}`.toLowerCase().includes(query.toLowerCase()));
  const checkedField = fields.find((field) => String(field.id) === checker);
  return <div className="admin-content management-module custom-fields-module"><ModuleHeader eyebrow="Listing form builder" title="Custom fields" copy="Control the information businesses provide and where each field appears across Findra." action={() => setCreating(true)} actionLabel="Add custom field" /><section className="management-metrics"><article><FileText /><span><small>Total fields</small><strong>{fields.length}</strong></span></article><article><Plus /><span><small>Custom fields</small><strong>{fields.filter((field) => !field.builtin).length}</strong></span></article><article><CheckCircle /><span><small>Active fields</small><strong>{fields.filter((field) => field.status === "Active").length}</strong></span></article></section><section className="panel custom-fields-panel"><header className="management-table-tools"><div><h3>Field library</h3><p>Built-in fields stay protected; custom fields can be edited, reordered, or removed.</p></div><select value={section} onChange={(event) => setSection(event.target.value)}><option>All sections</option><option>Business details</option><option>Contact & location</option><option>Media & review</option></select></header><div className="custom-field-list">{rows.map((field) => <article key={field.id}><div className="field-order-controls"><button aria-label={`Move ${field.name} up`} onClick={() => move(field, -1)}><ArrowUp /></button><button aria-label={`Move ${field.name} down`} onClick={() => move(field, 1)}><ArrowDown /></button></div><div className="custom-field-copy"><div><h3>{field.name}</h3>{field.builtin && <span>Built-in</span>}{field.required && <span>Required</span>}</div><p>{field.slug} · {field.section}</p></div><span className="custom-field-type">{field.type}</span><span className={`management-status ${field.status.toLowerCase()}`}>{field.status}</span><div className="management-row-actions"><button aria-label={`Edit ${field.name}`} onClick={() => setEditing(field)}><PencilSimple /></button><button disabled={field.builtin} aria-label={`Delete ${field.name}`} onClick={() => remove(field)}><Trash /></button></div></article>)}</div></section><section className="panel visibility-checker"><div><span className="section-eyebrow">Visibility checker</span><h3>Where does this field appear?</h3><p>Select a field to review its active surfaces before editing it.</p></div><select value={checker} onChange={(event) => setChecker(event.target.value)}><option value="">Choose a field</option>{fields.map((field) => <option value={field.id} key={field.id}>{field.name}</option>)}</select>{checkedField && <div className="visibility-result">{[["listingForm", "Listing form"], ["publicProfile", "Public listing"], ["adminDashboard", "Admin dashboard"]].map(([key, label]) => <span className={checkedField.visibility?.[key] !== false ? "visible" : "hidden"} key={key}><CheckCircle weight="fill" />{label}</span>)}</div>}</section>{(creating || editing) && <CustomFieldEditor item={editing} close={() => { setCreating(false); setEditing(null); }} save={save} />}</div>;
}
