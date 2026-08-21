/**
 * Demo seed — reproduces the data shown in the Claude Design mockups.
 *
 * Running the app against a fresh database opens on exactly the screens the
 * design shows: the Customer Commerce ART train, its three projects, the Web
 * Storefront backlog, and a scheduled roadmap.
 *
 *   node server/seed.js          seed only if the database is empty
 *   node server/seed.js --reset  wipe and reseed
 */

const { db, nextRef } = require("./db");
const { hashPassword } = require("./auth");

const DEMO_PASSWORD = process.env.SPA_DEMO_PASSWORD || "piplanning";

/* ------------------------------------------------------------------ *
 * Data, transcribed from the design
 * ------------------------------------------------------------------ */

const USERS = [
  { email: "lea.moore@commerce-group.com", name: "Lea Moore", initials: "LM", role: "Product Owner", status: "active", lastAccess: "-5 minutes" },
  { email: "adam.mercer@commerce-group.com", name: "Adam Mercer", initials: "AM", role: "Business Analyst", status: "active", lastAccess: "-2 hours" },
  { email: "tom.barnes@commerce-group.com", name: "Tom Barnes", initials: "TB", role: "Scrum Master", status: "active", lastAccess: "-1 day" },
  { email: "sophie.dobbs@commerce-group.com", name: "Sophie Dobbs", initials: "SD", role: "Business Analyst", status: "deactivated", lastAccess: "-3 months" },
  { email: "karim.benali@commerce-group.com", name: "Karim Benali", initials: "KB", role: "Administrator", status: "active", lastAccess: "-20 minutes" },
];

/** The 12 train-level requirements; the overview table shows the first four. */
const SHARED_REQUIREMENTS = [
  { ref: "TR-REQ-01", title: "Single customer identity across all channels", status: "approved" },
  { ref: "TR-REQ-02", title: "Shared session lifetime of 30 minutes on every channel", status: "approved" },
  { ref: "TR-REQ-03", title: "One catalogue of products served to web and mobile", status: "approved" },
  { ref: "TR-REQ-04", title: "PSD2 strong customer authentication on payment", status: "in_review" },
  { ref: "TR-REQ-05", title: "Prices and promotions resolved by a single pricing service", status: "approved" },
  { ref: "TR-REQ-06", title: "Stock levels reconciled across warehouse and storefront", status: "in_review" },
  { ref: "TR-REQ-07", title: "GDPR consent registry shared by all customer touchpoints", status: "approved" },
  { ref: "TR-REQ-08", title: "Audit trail retained for seven years on financial events", status: "approved" },
  { ref: "TR-REQ-09", title: "Order reference format unique across channels", status: "in_review" },
  { ref: "TR-REQ-10", title: "Customer notifications sent through one messaging gateway", status: "approved" },
  { ref: "TR-REQ-11", title: "Accessibility conformance to WCAG 2.2 level AA", status: "in_review" },
  { ref: "TR-REQ-12", title: "Service degradation must never block order capture", status: "approved" },
];

/**
 * The Web Storefront URD, transcribed as 47 requirements across its sections —
 * the count the design's sidebar shows.
 */
const STOREFRONT_REQUIREMENTS = [
  ["3.1", "Authentication", [
    "The customer must be able to create an account with an email address and a password compliant with the group security policy.",
    "The system must allow sign-in through an external identity provider (Google, Apple).",
    "The system must verify the email address before the account can place an order.",
    "Passwords must be at least 12 characters and checked against a breached-password list.",
    "The system must offer optional two-factor authentication by time-based one-time code.",
    "A session must expire after 30 minutes of inactivity.",
  ]],
  ["3.2", "Password reset", [
    "If forgotten, a reset link valid for 30 minutes must be sent to the registered email address.",
    "Three failed sign-in attempts must lock the account for 15 minutes.",
    "The customer must be notified by email whenever their password changes.",
    "A support agent must be able to unlock an account without seeing the password.",
  ]],
  ["3.3", "Customer profile", [
    "The customer must be able to edit their name, email address and telephone number.",
    "The system must keep an address book of up to ten delivery addresses.",
    "The customer must be able to designate one default billing and one default delivery address.",
    "Changing the email address must require confirmation from both the old and the new address.",
  ]],
  ["3.4", "Consent and privacy", [
    "The customer must be able to review and withdraw every marketing consent individually.",
    "The system must record the timestamp and source of each consent decision.",
    "The customer must be able to export their personal data in a machine-readable format.",
    "The customer must be able to request deletion of their account and personal data.",
    "Deletion requests must be honoured within 30 days and must retain legally required financial records.",
  ]],
  ["4.1", "Catalogue and search", [
    "The storefront must display product availability derived from live stock levels.",
    "Search results must return within 500 ms for the 95th percentile of queries.",
    "The customer must be able to filter results by category, price range and availability.",
  ]],
  ["4.2", "Cart", [
    "The cart must persist for 30 days for a signed-in customer.",
    "The cart must survive the transition from guest to signed-in customer without losing items.",
    "The system must recalculate promotions whenever the cart contents change.",
  ]],
  ["4.3", "Checkout", [
    "The customer must be able to complete a purchase without creating an account.",
    "Guest checkout must offer account creation after the order is confirmed.",
    "The system must display the total including taxes and delivery before payment.",
    "The checkout must not exceed three steps from cart to confirmation.",
    "The system must prevent submitting the same order twice on a double click.",
  ]],
  ["4.4", "Payment", [
    "Payment must support card, wallet and voucher tender types.",
    "Card details must never be stored by the storefront and must be tokenised by the payments service.",
    "Strong customer authentication must be triggered where PSD2 requires it.",
    "A failed payment must preserve the cart and allow another tender type.",
  ]],
  ["5.1", "Order management", [
    "The customer must receive an order confirmation by email within one minute.",
    "The customer must be able to view every past order with its lines and totals.",
    "The customer must be able to amend an order within 30 minutes of placing it.",
    "An order that has entered picking must no longer be amendable.",
  ]],
  ["5.2", "Delivery", [
    "The customer must be able to track a delivery from a carrier reference.",
    "The system must notify the customer when a parcel is dispatched and when it is delivered.",
    "The customer must be able to choose a delivery slot where the carrier offers one.",
  ]],
  ["5.3", "Returns and refunds", [
    "The customer must be able to request a return within 30 days of delivery.",
    "A refund must be issued to the original tender type.",
    "A support agent must be able to issue a partial refund with a reason code.",
    "The customer must be able to follow the status of a refund request.",
  ]],
  ["6.1", "Non-functional", [
    "The storefront must remain available 99.9 % of the time measured monthly.",
    "Every customer-facing page must meet WCAG 2.2 level AA.",
  ]],
];

const SPRINTS = [
  { name: "Sprint 1", pi: "PI 2026.1", starts: "2026-02-02", ends: "2026-02-13" },
  { name: "Sprint 2", pi: "PI 2026.1", starts: "2026-02-16", ends: "2026-02-27" },
  { name: "Sprint 3", pi: "PI 2026.1", starts: "2026-03-02", ends: "2026-03-13" },
  { name: "Sprint 4", pi: "PI 2026.1", starts: "2026-03-16", ends: "2026-03-27" },
  { name: "Sprint 5", pi: "PI 2026.1", starts: "2026-03-30", ends: "2026-04-10" },
  { name: "Sprint 6", pi: "PI 2026.2", starts: "2026-04-13", ends: "2026-04-24" },
];

const PROJECTS = [
  { name: "Web Storefront", description: "B2C customer purchase journey redesign", status: "in_review", step: 3, team: "ART Digital Retail", capacity: 30 },
  { name: "Mobile App", description: "Supplier onboarding and order tracking", status: "in_review", step: 6, team: "ART Digital Retail", capacity: 24 },
  { name: "Payments Service", description: "Warehouse order picking", status: "ready", step: 10, team: "ART Payments", capacity: 20 },
  { name: "Loyalty Mobile App", description: "Points and coupons program", status: "draft", step: 0, team: "ART Digital Retail", capacity: 0 },
  { name: "Business Customer Portal", description: "Multi-user accounts and billing", status: "ready", step: 10, team: "ART B2B", capacity: 0 },
];

/** Web Storefront: the project every pipeline screen in the design shows. */
const STOREFRONT_EPICS = [
  { ref: "EPIC-01", title: "Customer Authentication", description: "Account creation, sign-in, and credential recovery across every channel.", status: "approved" },
  { ref: "EPIC-02", title: "Order Management", description: "Placing, tracking, and amending customer orders.", status: "approved" },
  { ref: "EPIC-03", title: "Profile & Addresses", description: "Customer profile data, address book, and consent management.", status: "in_review" },
  { ref: "EPIC-04", title: "Checkout & Payment", description: "Cart, checkout flow, and payment capture.", status: "rejected" },
];

const STOREFRONT_FEATURES = [
  { ref: "FEAT-01", epic: "EPIC-01", title: "Email / password login", points: 13, moscow: "Must", status: "approved", sprint: "Sprint 1" },
  { ref: "FEAT-02", epic: "EPIC-01", title: "Social login (SSO)", points: 8, moscow: "Should", status: "in_review", sprint: "Sprint 2" },
  { ref: "FEAT-05", epic: "EPIC-01", title: "Guest checkout", points: 21, moscow: "Must", status: "in_review", sprint: "Sprint 2" },
  { ref: "FEAT-03", epic: "EPIC-02", title: "Order tracking", points: 13, moscow: "Should", status: "approved", sprint: "Sprint 4" },
  { ref: "FEAT-04", epic: "EPIC-02", title: "Refund flow", points: 21, moscow: "Should", status: "in_review", sprint: "Sprint 4" },
  { ref: "FEAT-06", epic: "EPIC-02", title: "Order amendment window", points: 8, moscow: "Could", status: "in_review", sprint: "Sprint 5" },
  { ref: "FEAT-07", epic: "EPIC-03", title: "Address book", points: 5, moscow: "Should", status: "approved", sprint: "Sprint 3" },
  { ref: "FEAT-08", epic: "EPIC-03", title: "GDPR consent centre", points: 8, moscow: "Must", status: "approved", sprint: "Sprint 3" },
  { ref: "FEAT-09", epic: "EPIC-03", title: "Marketing preferences", points: 3, moscow: "Could", status: "rejected", sprint: null },
];

const MOBILE_FEATURES = [
  { ref: "FEAT-21", title: "Mobile sign-in", points: 8, moscow: "Must", status: "approved", sprint: "Sprint 2" },
  { ref: "FEAT-22", title: "Push order updates", points: 5, moscow: "Could", status: "approved", sprint: "Sprint 4" },
  { ref: "FEAT-23", title: "In-app refund request", points: 13, moscow: "Should", status: "in_review", sprint: "Sprint 5" },
  { ref: "FEAT-24", title: "Supplier onboarding wizard", points: 13, moscow: "Should", status: "approved", sprint: "Sprint 1" },
  { ref: "FEAT-25", title: "Barcode scanning", points: 8, moscow: "Could", status: "approved", sprint: "Sprint 3" },
  { ref: "FEAT-26", title: "Offline order queue", points: 21, moscow: "Should", status: "in_review", sprint: "Sprint 4" },
  { ref: "FEAT-27", title: "Delivery proof capture", points: 8, moscow: "Should", status: "approved", sprint: "Sprint 3" },
  { ref: "FEAT-28", title: "Multi-language support", points: 5, moscow: "Could", status: "approved", sprint: "Sprint 5" },
];

const PAYMENTS_FEATURES = [
  { ref: "FEAT-11", title: "Tokenized card vault", points: 21, moscow: "Must", status: "approved", sprint: "Sprint 3" },
  { ref: "FEAT-12", title: "Refund API", points: 13, moscow: "Must", status: "approved", sprint: "Sprint 5" },
  { ref: "FEAT-13", title: "SCA / 3DS2 challenge", points: 21, moscow: "Must", status: "approved", sprint: "Sprint 1" },
  { ref: "FEAT-14", title: "Wallet payouts", points: 8, moscow: "Could", status: "approved", sprint: "Sprint 6" },
  { ref: "FEAT-15", title: "Chargeback handling", points: 13, moscow: "Should", status: "approved", sprint: "Sprint 2" },
  { ref: "FEAT-16", title: "Settlement reconciliation", points: 13, moscow: "Should", status: "approved", sprint: "Sprint 4" },
  { ref: "FEAT-17", title: "Payment method routing", points: 8, moscow: "Should", status: "approved", sprint: "Sprint 2" },
];

const STOREFRONT_STORIES = [
  { ref: "US-01", epic: "EPIC-01", feature: "FEAT-01", actor: "customer", want: "to create an account", benefit: "I can save my details for future orders", points: 5, moscow: "Must", status: "approved", confidence: 0.91 },
  { ref: "US-02", epic: "EPIC-01", feature: "FEAT-01", actor: "customer", want: "to sign in with my email and password", benefit: "I can access my account and orders", points: 5, moscow: "Must", status: "in_review", confidence: 0.86,
    criteria: [
      { given: "an active customer account with a verified email", when: "I enter my correct email and password", then: "I am redirected to my account in under 800 ms" },
      { given: "three failed sign-in attempts", when: "I enter a wrong password a fourth time", then: "my account is locked for 15 minutes and I am notified by email" },
    ] },
  { ref: "US-03", epic: "EPIC-01", feature: "FEAT-01", actor: "customer", want: "to reset my password", benefit: "I can recover access if I forget it", points: 3, moscow: "Should", status: "approved", confidence: 0.88,
    criteria: [{ given: "a registered email address", when: "I request a reset link", then: "a link valid for 30 minutes is sent to that address" }] },
  { ref: "US-04", epic: "EPIC-01", feature: "FEAT-02", actor: "customer", want: "to sign in with Google", benefit: "I do not need another password", points: 5, moscow: "Should", status: "approved", confidence: 0.79 },
  { ref: "US-05", epic: "EPIC-01", feature: "FEAT-02", actor: "customer", want: "to sign in with an SMS code", benefit: "I can sign in without my password", points: 8, moscow: "Wont", status: "rejected", confidence: 0.52 },
  { ref: "US-06", epic: "EPIC-01", feature: "FEAT-05", actor: "customer", want: "to check out without an account", benefit: "I can buy quickly the first time", points: 8, moscow: "Must", status: "in_review", confidence: 0.83 },
  { ref: "US-07", epic: "EPIC-02", feature: "FEAT-03", actor: "customer", want: "to place an order", benefit: "I receive the products I selected", points: 13, moscow: "Must", status: "approved", confidence: 0.94 },
  { ref: "US-08", epic: "EPIC-02", feature: "FEAT-03", actor: "customer", want: "to see my order history", benefit: "I can check what I bought before", points: 3, moscow: "Should", status: "approved", confidence: 0.9 },
  { ref: "US-09", epic: "EPIC-02", feature: "FEAT-03", actor: "customer", want: "to track my delivery", benefit: "I know when to expect my parcel", points: 8, moscow: "Should", status: "approved", confidence: 0.87 },
  { ref: "US-10", epic: "EPIC-02", feature: "FEAT-04", actor: "customer", want: "to request a refund", benefit: "I get my money back for returned items", points: 8, moscow: "Should", status: "in_review", confidence: 0.81 },
  { ref: "US-11", epic: "EPIC-02", feature: "FEAT-04", actor: "customer", want: "to pay in three instalments", benefit: "I can spread the cost", points: 13, moscow: "Wont", status: "rejected", confidence: 0.44 },
  { ref: "US-12", epic: "EPIC-02", feature: "FEAT-06", actor: "customer", want: "to amend an order within 30 minutes", benefit: "I can fix a mistake without cancelling", points: 8, moscow: "Could", status: "in_review", confidence: 0.72 },
  { ref: "US-13", epic: "EPIC-03", feature: "FEAT-07", actor: "customer", want: "to edit my information", benefit: "my details stay accurate", points: 3, moscow: "Should", status: "approved", confidence: 0.89 },
  { ref: "US-14", epic: "EPIC-03", feature: "FEAT-07", actor: "customer", want: "to store several delivery addresses", benefit: "I can ship to home or work", points: 5, moscow: "Should", status: "approved", confidence: 0.85 },
  { ref: "US-15", epic: "EPIC-03", feature: "FEAT-08", actor: "customer", want: "to manage my GDPR consents", benefit: "I control how my data is used", points: 8, moscow: "Must", status: "in_review", confidence: 0.9 },
  { ref: "US-16", epic: "EPIC-03", feature: "FEAT-08", actor: "customer", want: "to download my personal data", benefit: "I can exercise my right to portability", points: 5, moscow: "Must", status: "approved", confidence: 0.88 },
  { ref: "US-17", epic: "EPIC-03", feature: "FEAT-08", actor: "customer", want: "to delete my account", benefit: "I can leave the service entirely", points: 5, moscow: "Must", status: "approved", confidence: 0.86 },
  { ref: "US-18", epic: "EPIC-03", feature: "FEAT-09", actor: "customer", want: "to choose my marketing channels", benefit: "I only get messages I want", points: 3, moscow: "Could", status: "rejected", confidence: 0.61 },
  { ref: "US-19", epic: "EPIC-02", feature: "FEAT-03", actor: "customer", want: "to read the FAQ", benefit: "I can answer my own questions", points: 2, moscow: "Could", status: "in_review", confidence: 0.58 },
  { ref: "US-20", epic: "EPIC-01", feature: "FEAT-01", actor: "support agent", want: "to unlock a customer account", benefit: "I can help a locked-out customer", points: 3, moscow: "Must", status: "approved", confidence: 0.77 },
  { ref: "US-21", epic: "EPIC-02", feature: "FEAT-04", actor: "support agent", want: "to issue a partial refund", benefit: "I can resolve a dispute fairly", points: 8, moscow: "Wont", status: "in_review", confidence: 0.75 },
  { ref: "US-22", epic: "EPIC-01", feature: "FEAT-05", actor: "customer", want: "to convert my guest order into an account", benefit: "I keep my order history", points: 5, moscow: "Could", status: "in_review", confidence: 0.7 },
  { ref: "US-23", epic: "EPIC-02", feature: "FEAT-03", actor: "customer", want: "to receive a delivery notification", benefit: "I know my parcel has arrived", points: 3, moscow: "Could", status: "approved", confidence: 0.84 },
];

/** Story-level dependencies inside Web Storefront — the sidebar's "Dependencies 3". */
const STORY_DEPENDENCIES = [
  { from: "US-01", to: "US-02", severity: "normal", note: "Sign-in needs the account record that registration creates." },
  { from: "US-02", to: "US-07", severity: "blocking", note: "Placing an order requires an authenticated session." },
  { from: "US-07", to: "US-09", severity: "normal", note: "There is nothing to track until an order exists." },
];

/** Cross-project dependencies the design's matrix and roadmap arrows show. */
const DEPENDENCIES = [
  { from: "FEAT-13", to: "FEAT-01", severity: "blocking", note: "Storefront login must call the SCA challenge published by Payments." },
  { from: "FEAT-11", to: "FEAT-05", severity: "blocking", note: "Guest checkout captures cards through the Payments token vault." },
  { from: "FEAT-01", to: "FEAT-21", severity: "normal", note: "Mobile sign-in reuses the identity issued by the storefront login." },
  { from: "FEAT-12", to: "FEAT-04", severity: "normal", note: "The storefront refund flow calls the Payments refund API." },
  { from: "FEAT-04", to: "FEAT-23", severity: "normal", note: "In-app refunds reuse the storefront refund state machine." },
];

/* ------------------------------------------------------------------ *
 * Seeding
 * ------------------------------------------------------------------ */

/** Turns a requirement sentence into a short title for list views. */
function shorten(sentence, maxWords = 9) {
  const cleaned = String(sentence)
    .replace(/^(the|a|an)\s+/i, "")
    .replace(/[.;:]+\s*$/, "")
    .trim();
  const words = cleaned.split(/\s+/);
  const text = words.length > maxWords ? `${words.slice(0, maxWords).join(" ")}…` : cleaned;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function reset() {
  const tables = [
    "audit_log", "export_runs", "capacity", "wsjf", "dependencies", "acceptance_criteria",
    "tasks", "stories", "clusters", "features", "epics", "requirements", "documents",
    "sprints", "projects", "trains", "sessions", "users", "settings",
  ];
  db.pragma("foreign_keys = OFF");
  db.transaction(() => {
    for (const t of tables) db.prepare(`DELETE FROM ${t}`).run();
    // sqlite_sequence only exists once some table uses AUTOINCREMENT. The
    // schema uses plain INTEGER PRIMARY KEY, so ids restart on their own —
    // but reset the counter anyway if a later migration introduces one.
    const hasSequence = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'sqlite_sequence'")
      .get();
    if (hasSequence) db.prepare("DELETE FROM sqlite_sequence").run();
  })();
  db.pragma("foreign_keys = ON");
}

function seed() {
  const passwordHash = hashPassword(DEMO_PASSWORD);

  db.transaction(() => {
    /* Users ------------------------------------------------------- */
    const insertUser = db.prepare(
      `INSERT INTO users (email, name, initials, role, password_hash, status, last_access_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))`,
    );
    for (const u of USERS) {
      insertUser.run(u.email, u.name, u.initials, u.role, passwordHash, u.status, u.lastAccess);
    }
    const lea = db.prepare("SELECT * FROM users WHERE initials = 'LM'").get();
    const karim = db.prepare("SELECT * FROM users WHERE initials = 'KB'").get();
    const adam = db.prepare("SELECT * FROM users WHERE initials = 'AM'").get();

    /* Train ------------------------------------------------------- */
    const trainId = db
      .prepare(
        `INSERT INTO trains (name, description, rte, pi_name, sprint_current, sprint_count)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run("Customer Commerce ART", "Three projects advancing together toward one customer experience.",
           "Karim Benali", "PI 2026.1", 2, 5).lastInsertRowid;

    const sprintIds = {};
    const insertSprint = db.prepare(
      "INSERT INTO sprints (train_id, name, pi_name, starts_on, ends_on, position) VALUES (?, ?, ?, ?, ?, ?)",
    );
    SPRINTS.forEach((s, i) => {
      sprintIds[s.name] = insertSprint.run(trainId, s.name, s.pi, s.starts, s.ends, i).lastInsertRowid;
    });

    /* Shared (train-level) requirements ---------------------------- */
    const insertShared = db.prepare(
      `INSERT INTO requirements (train_id, scope, ref, title, status, ai_generated, confidence)
       VALUES (?, 'train', ?, ?, ?, 1, ?)`,
    );
    for (const r of SHARED_REQUIREMENTS) {
      insertShared.run(trainId, r.ref, r.title, r.status, 0.88);
    }

    /* Projects ---------------------------------------------------- */
    const projectIds = {};
    const insertProject = db.prepare(
      `INSERT INTO projects (train_id, name, description, status, pipeline_step, safe_team)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (const p of PROJECTS) {
      // The last two projects in the design are not part of this train.
      const owningTrain = ["Loyalty Mobile App", "Business Customer Portal"].includes(p.name) ? null : trainId;
      projectIds[p.name] = insertProject
        .run(owningTrain, p.name, p.description, p.status, p.step, p.team).lastInsertRowid;
    }

    /* Capacity ---------------------------------------------------- */
    const insertCapacity = db.prepare(
      "INSERT INTO capacity (sprint_id, project_id, available_points) VALUES (?, ?, ?)",
    );
    for (const p of PROJECTS) {
      if (!p.capacity) continue;
      for (const s of SPRINTS) insertCapacity.run(sprintIds[s.name], projectIds[p.name], p.capacity);
    }

    /* Web Storefront: source document + its 47 requirements --------- */
    const storefront = projectIds["Web Storefront"];

    const documentId = db
      .prepare(
        `INSERT INTO documents (project_id, scope, filename, mime, size_bytes, pages,
                                status, progress, sections_detected, extracted_text)
         VALUES (?, 'project', ?, 'application/pdf', ?, 38, 'parsed', 100, ?, ?)`,
      )
      .run(
        storefront, "URD_Storefront_v2.3.pdf", 4_404_019,
        STOREFRONT_REQUIREMENTS.length,
        STOREFRONT_REQUIREMENTS
          .map(([num, title, lines]) => `${num} ${title}\n${lines.join("\n")}`)
          .join("\n\n"),
      ).lastInsertRowid;

    const insertRequirement = db.prepare(
      `INSERT INTO requirements (project_id, document_id, scope, ref, title, body,
                                 source_section, source_page, status, ai_generated, confidence)
       VALUES (?, ?, 'project', ?, ?, ?, ?, ?, ?, 1, ?)`,
    );
    let reqSeq = 1;
    let reqPage = 3;
    for (const [num, , lines] of STOREFRONT_REQUIREMENTS) {
      for (const line of lines) {
        // Most are accepted; a slice stays in review and a couple are rejected,
        // so the review screen has all three states to show.
        const status = reqSeq % 9 === 0 ? "rejected" : reqSeq % 4 === 0 ? "in_review" : "approved";
        insertRequirement.run(
          storefront, documentId, `REQ-${String(reqSeq).padStart(2, "0")}`,
          shorten(line), line, num, reqPage,
          status, Number((0.72 + ((reqSeq * 7) % 25) / 100).toFixed(2)),
        );
        reqSeq++;
      }
      reqPage += 3;
    }
    const epicIds = {};
    const insertEpic = db.prepare(
      "INSERT INTO epics (project_id, ref, title, description, status, ai_generated, confidence) VALUES (?, ?, ?, ?, ?, 1, ?)",
    );
    for (const e of STOREFRONT_EPICS) {
      epicIds[e.ref] = insertEpic.run(storefront, e.ref, e.title, e.description, e.status, 0.85).lastInsertRowid;
    }

    const featureIds = {};
    const insertFeature = db.prepare(
      `INSERT INTO features (project_id, epic_id, sprint_id, ref, title, description, points, moscow, status, ai_generated, ai_scheduled, confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    );
    for (const f of STOREFRONT_FEATURES) {
      featureIds[f.ref] = insertFeature.run(
        storefront, epicIds[f.epic] || null, f.sprint ? sprintIds[f.sprint] : null,
        f.ref, f.title, null, f.points, f.moscow, f.status, f.sprint ? 1 : 0, 0.82,
      ).lastInsertRowid;
    }

    const storyIds = {};
    const insertStory = db.prepare(
      `INSERT INTO stories (project_id, feature_id, epic_id, ref, actor, want, benefit, points, moscow, status, ai_generated, confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    );
    const insertCriterion = db.prepare(
      "INSERT INTO acceptance_criteria (story_id, given_txt, when_txt, then_txt, position) VALUES (?, ?, ?, ?, ?)",
    );
    for (const s of STOREFRONT_STORIES) {
      const id = insertStory.run(
        storefront, featureIds[s.feature] || null, epicIds[s.epic] || null, s.ref,
        s.actor, s.want, s.benefit, s.points, s.moscow, s.status, s.confidence,
      ).lastInsertRowid;
      storyIds[s.ref] = id;

      const criteria = s.criteria || [
        { given: `a customer using the ${s.actor === "support agent" ? "back office" : "storefront"}`,
          when: `they ${s.want.replace(/^to /, "")}`,
          then: "the system completes the action and confirms it" },
      ];
      criteria.forEach((c, i) => insertCriterion.run(id, c.given, c.when, c.then, i));
    }

    /* Tasks — only on approved stories, matching the design's counts -- */
    const insertTask = db.prepare(
      "INSERT INTO tasks (project_id, story_id, ref, title, hours, done, ai_generated) VALUES (?, ?, ?, ?, ?, ?, 1)",
    );
    const TASK_TEMPLATES = [
      ["Design the data model", 4, 1],
      ["Implement the API endpoint", 8, 1],
      ["Build the interface", 6, 0],
      ["Write unit tests", 3, 0],
      ["Cover the acceptance criteria end to end", 4, 0],
    ];
    let taskSeq = 1;
    const approvedStories = STOREFRONT_STORIES.filter((s) => s.status === "approved");
    approvedStories.forEach((s, index) => {
      // The last two stories are still being broken down, so they carry fewer
      // tasks — the checklist screen shows partially-decomposed stories too.
      const templates = index >= approvedStories.length - 2
        ? TASK_TEMPLATES.slice(0, 4)
        : TASK_TEMPLATES;
      for (const [title, hours, done] of templates) {
        insertTask.run(storefront, storyIds[s.ref], `TASK-${String(taskSeq++).padStart(2, "0")}`,
                       `${title} — ${s.ref}`, hours, done);
      }
    });

    /* Story-level dependencies ------------------------------------ */
    const insertStoryDep = db.prepare(
      `INSERT OR IGNORE INTO dependencies (from_type, from_id, to_type, to_id, kind, severity, note)
       VALUES ('story', ?, 'story', ?, 'blocks', ?, ?)`,
    );
    for (const d of STORY_DEPENDENCIES) {
      if (storyIds[d.from] && storyIds[d.to]) {
        insertStoryDep.run(storyIds[d.from], storyIds[d.to], d.severity, d.note);
      }
    }

    /* Clusters ---------------------------------------------------- */
    const insertCluster = db.prepare(
      "INSERT INTO clusters (project_id, name, summary, kind, similarity) VALUES (?, ?, ?, ?, ?)",
    );
    const CLUSTERS = [
      { name: "Sign-in & credentials", refs: ["US-02", "US-03", "US-04", "US-05", "US-20"], kind: "duplicate", similarity: 0.71 },
      { name: "Account creation", refs: ["US-01", "US-22"], kind: "cluster", similarity: 0.64 },
      { name: "Order lifecycle", refs: ["US-07", "US-08", "US-12"], kind: "cluster", similarity: 0.58 },
      { name: "Delivery tracking", refs: ["US-09", "US-23"], kind: "duplicate", similarity: 0.74 },
      { name: "Refunds", refs: ["US-10", "US-21"], kind: "duplicate", similarity: 0.69 },
      { name: "Personal data & consent", refs: ["US-13", "US-14", "US-15", "US-16", "US-17", "US-18"], kind: "cluster", similarity: 0.55 },
    ];
    for (const c of CLUSTERS) {
      const id = insertCluster.run(storefront, c.name,
        `${c.refs.length} stories with a cohesion of ${c.similarity}.`, c.kind, c.similarity).lastInsertRowid;
      for (const ref of c.refs) {
        if (storyIds[ref]) db.prepare("UPDATE stories SET cluster_id = ? WHERE id = ?").run(id, storyIds[ref]);
      }
    }

    /* WSJF scores ------------------------------------------------- */
    const insertWsjf = db.prepare(
      `INSERT INTO wsjf (entity_type, entity_id, business_value, time_criticality, risk_reduction, job_size)
       VALUES ('story', ?, ?, ?, ?, ?)`,
    );
    const WSJF = {
      "US-02": [8, 8, 5, 5], "US-01": [9, 7, 3, 5], "US-07": [10, 8, 5, 13],
      "US-09": [6, 5, 2, 8], "US-15": [4, 3, 6, 8], "US-03": [6, 6, 4, 3],
      "US-16": [5, 4, 7, 5], "US-17": [4, 3, 7, 5],
    };
    for (const [ref, v] of Object.entries(WSJF)) {
      if (storyIds[ref]) insertWsjf.run(storyIds[ref], v[0], v[1], v[2], v[3]);
    }

    /* Mobile App and Payments Service features -------------------- */
    const addFeatures = (projectName, list) => {
      const pid = projectIds[projectName];
      for (const f of list) {
        featureIds[f.ref] = insertFeature.run(
          pid, null, f.sprint ? sprintIds[f.sprint] : null, f.ref, f.title, null,
          f.points, f.moscow, f.status, f.sprint ? 1 : 0, 0.8,
        ).lastInsertRowid;
      }
    };
    addFeatures("Mobile App", MOBILE_FEATURES);
    addFeatures("Payments Service", PAYMENTS_FEATURES);

    /* Dependencies ------------------------------------------------ */
    const insertDep = db.prepare(
      `INSERT OR IGNORE INTO dependencies (from_type, from_id, to_type, to_id, kind, severity, note)
       VALUES ('feature', ?, 'feature', ?, 'blocks', ?, ?)`,
    );
    for (const d of DEPENDENCIES) {
      if (featureIds[d.from] && featureIds[d.to]) {
        insertDep.run(featureIds[d.from], featureIds[d.to], d.severity, d.note);
      }
    }

    /* Settings ---------------------------------------------------- */
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_provider', 'Anthropic')").run();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_model', 'claude-opus-5')").run();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_min_confidence', '0.7')").run();

    /* Audit trail ------------------------------------------------- */
    const insertAudit = db.prepare(
      `INSERT INTO audit_log (user_id, actor_name, action, entity_type, entity_ref, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))`,
    );
    const TRAIL = [
      [lea, "approved", "epic", "EPIC-01", null, "-3 hours"],
      [null, "merged US-03 and US-04", "cluster", "Sign-in & credentials", "Clustering agent", "-3 hours"],
      [lea, "rejected", "epic", "EPIC-04", "Checkout & Payment moved to the next PI", "-4 hours"],
      [adam, "edited", "requirement", "REQ-03", null, "-5 hours"],
      [karim, "deactivated the account", "user", "sophie.dobbs@commerce-group.com", null, "-6 hours"],
    ];
    for (const [user, action, type, ref, detail, when] of TRAIL) {
      insertAudit.run(user ? user.id : null, user ? user.name : "Clustering agent",
                      action, type, ref, detail, when);
    }
  })();
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

if (require.main === module) {
  const force = process.argv.includes("--reset");
  const existing = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;

  if (existing > 0 && !force) {
    console.log(`Database already has ${existing} users. Pass --reset to wipe and reseed.`);
    process.exit(0);
  }
  if (force) reset();
  seed();

  const counts = ["users", "trains", "projects", "epics", "features", "stories", "tasks", "clusters", "dependencies"]
    .map((t) => `${t}: ${db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n}`)
    .join(", ");
  console.log(`Seeded. ${counts}`);
  console.log(`\nSign in with any of these, password "${DEMO_PASSWORD}":`);
  for (const u of USERS.filter((u) => u.status === "active")) {
    console.log(`  ${u.email.padEnd(38)} ${u.role}`);
  }
}

module.exports = { seed, reset, DEMO_PASSWORD, USERS };
