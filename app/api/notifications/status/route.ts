import { notificationsConfigured } from "../email";

export async function GET() {
  return Response.json({ enabled: notificationsConfigured() });
}
