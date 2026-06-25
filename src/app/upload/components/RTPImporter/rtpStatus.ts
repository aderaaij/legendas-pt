/** Display helpers mapping a scraping result status to a themed color/label. */

export function getStatusColor(status: string): string {
  switch (status) {
    case "success":
      return "var(--green)";
    case "already_exists":
      return "var(--blue)";
    case "no_subtitle":
      return "var(--gold)";
    case "error":
    case "extraction_failed":
      return "var(--accent2)";
    default:
      return "var(--muted)";
  }
}

export function getStatusText(status: string): string {
  switch (status) {
    case "success":
      return "Success";
    case "already_exists":
      return "Already Exists";
    case "no_subtitle":
      return "No Subtitle";
    case "extraction_failed":
      return "Extraction Failed";
    case "error":
      return "Error";
    default:
      return status;
  }
}
