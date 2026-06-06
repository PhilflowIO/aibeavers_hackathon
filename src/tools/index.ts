import { emailTools } from "./email.js";
import { calendarTools } from "./calendar.js";
import { contactTools } from "./contacts.js";

/** Alle Agent-Tools gebündelt. */
export const allTools = [...emailTools, ...calendarTools, ...contactTools];

export { emailTools, calendarTools, contactTools };
export * from "./email.js";
export * from "./calendar.js";
export * from "./contacts.js";
