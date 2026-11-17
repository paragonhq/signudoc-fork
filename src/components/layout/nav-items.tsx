import {
  ChevronLeft,
  ChevronRight,
  Clock,
  FilePlus2,
  FileStack,
  LayoutTemplate,
  Plus,
  Settings,
  Users,
  type IconComponent,
} from "@/components/ui/icons";

export type ShellSection =
  | "activity"
  | "contacts"
  | "documents"
  | "new-envelope"
  | "settings"
  | "templates"
  | "workspace";

export type ShellNavItem = {
  /** One line on what is there (the phone's "More" tray). */
  description?: string;
  href: string;
  icon: IconComponent;
  /** Extra words the command menu matches on. */
  keywords?: string[];
  label: string;
  section: ShellSection;
};

/** Places you go. "New envelope" is an action, so it is not in this list. */
export const primaryNavItems: ShellNavItem[] = [
  {
    href: "/dashboard",
    icon: FileStack,
    keywords: ["dashboard", "home", "envelopes"],
    label: "Documents",
    section: "documents",
  },
  {
    description: "What happened, as it happens",
    href: "/activity",
    icon: Clock,
    keywords: ["history", "timeline", "feed", "signed", "viewed"],
    label: "Activity",
    section: "activity",
  },
  {
    href: "/templates",
    icon: LayoutTemplate,
    keywords: ["library"],
    label: "Templates",
    section: "templates",
  },
  {
    description: "People you send to",
    href: "/contacts",
    icon: Users,
    keywords: ["people", "address book", "recipients", "signers"],
    label: "Contacts",
    section: "contacts",
  },
  {
    description: "Your account and organization",
    href: "/settings",
    icon: Settings,
    label: "Settings",
    section: "settings",
  },
];

function navItem(section: ShellSection): ShellNavItem {
  const item = primaryNavItems.find((entry) => entry.section === section);

  if (!item) {
    throw new Error(`No nav item for ${section}`);
  }

  return item;
}

/**
 * The phone's floating bar holds the two places people go daily; the
 * rest wait one tap away in "More".
 */
export const phoneTabItems: ShellNavItem[] = [
  navItem("documents"),
  navItem("templates"),
];

export const phoneMoreItems: ShellNavItem[] = [
  navItem("activity"),
  navItem("contacts"),
  navItem("settings"),
];

export const newEnvelopeItem: ShellNavItem = {
  href: "/envelopes/new",
  icon: Plus,
  label: "New envelope",
  section: "new-envelope",
};

/** The places in the top bar's tabs (Settings sits with the account). */
export const topNavItems: ShellNavItem[] = primaryNavItems.filter(
  (item) => item.section !== "settings",
);

export type NewChoice = {
  description: string;
  href: string;
  icon: IconComponent;
  id: "envelope" | "template" | "use-template";
  label: string;
};

/** What "New" offers, in this order, everywhere it appears. */
export const newChoices: NewChoice[] = [
  {
    description: "Upload a PDF, choose who signs",
    href: newEnvelopeItem.href,
    icon: Plus,
    id: "envelope",
    label: newEnvelopeItem.label,
  },
  {
    description: "Start from a saved document",
    href: "/templates",
    icon: LayoutTemplate,
    id: "use-template",
    label: "Use a template",
  },
  {
    description: "Set it up once, send it again",
    href: "/templates/new",
    icon: FilePlus2,
    id: "template",
    label: "New template",
  },
];

/** What the phone's top bar calls this place. */
export function sectionTitle(pathname: string): string {
  if (pathname === "/templates/new" || pathname.startsWith("/templates/new/")) {
    return "New template";
  }

  switch (resolveSection(pathname)) {
    case "documents":
      return "Documents";
    case "templates":
      return "Templates";
    case "settings":
      return "Settings";
    case "activity":
      return "Activity";
    case "contacts":
      return "Contacts";
    case "new-envelope":
      return "New envelope";
    default:
      return "";
  }
}

export function resolveSection(pathname: string): ShellSection {
  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    return "settings";
  }

  if (
    pathname === "/envelopes/new" ||
    pathname.startsWith("/envelopes/new/") ||
    /^\/envelopes\/[^/]+\/(review|signers)$/.test(pathname)
  ) {
    return "new-envelope";
  }

  if (pathname === "/dashboard" || /^\/envelopes\/[^/]+$/.test(pathname)) {
    return "documents";
  }

  if (pathname === "/templates" || pathname.startsWith("/templates/")) {
    return "templates";
  }

  if (pathname === "/activity" || pathname.startsWith("/activity/")) {
    return "activity";
  }

  if (pathname === "/contacts" || pathname.startsWith("/contacts/")) {
    return "contacts";
  }

  return "workspace";
}

export const ChevronLeftIcon = ChevronLeft;

export const ChevronRightIcon = ChevronRight;
