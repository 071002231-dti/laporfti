import type { Report } from "../types";

export interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  content: string;
  timestamp: string;
  suggestions?: string[];
  quickActions?: QuickAction[];
  ticketCard?: Report;
  ticketList?: Report[];
  confirmPayload?: Record<string, unknown>;
  component?: "file-upload";
}

export interface QuickAction {
  label: string;
  icon: string;
  action: string;
}

export type WizardStep =
  | "category"
  | "title"
  | "description"
  | "urgency"
  | "identity"
  | "identity-role"
  | "visibility"
  | "attachment"
  | "confirm"
  | "done"
  // Moderation steps
  | "mod_category"
  | "mod_status"
  | "mod_note"
  | "mod_confirm";

export type WizardState = 
  | {
      type: "CREATE_REPORT";
      step: WizardStep;
      data: {
        category?: string;
        title?: string;
        description?: string;
        urgency?: string;
        reporterName?: string;
        reporterRole?: string;
        reporterEmail?: string;
        reporterWhatsapp?: string;
        isPublic?: boolean;
        attachmentName?: string;
        attachmentPath?: string;
      };
    }
  | {
      type: "MODERATE_REPORT";
      step: WizardStep;
      data: {
        reportId: string;
        currentCategory: string;
        newCategory?: string;
        newStatus?: string;
        note?: string;
      };
    };
