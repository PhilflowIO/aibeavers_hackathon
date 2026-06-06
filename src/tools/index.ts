import { emailTools } from "./email.js";
import { calendarTools } from "./calendar.js";

/** Alle Agent-Tools gebündelt. */
export const allTools = [...emailTools, ...calendarTools];

export { emailTools, calendarTools };
export * from "./email.js";
export * from "./calendar.js";
