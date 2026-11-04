import { prisma } from "@/server/db/client";
import { NotificationChannel } from "@prisma/client";

export interface SendNotificationParams {
  userId: string;
  phone?: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface INotificationAdapter {
  send(params: SendNotificationParams): Promise<{ success: boolean; notificationId: string }>;
}

export class MockNotificationAdapter implements INotificationAdapter {
  async send(params: SendNotificationParams): Promise<{ success: boolean; notificationId: string }> {
    console.log(
      `[MOCK NOTIFICATION][${params.channel}] To: User(${params.userId}) Phone(${params.phone ?? "N/A"}) - ${params.title}: ${params.body}`
    );

    const record = await prisma.notification.create({
      data: {
        userId: params.userId,
        channel: params.channel,
        title: params.title,
        body: params.body,
        data: params.data ? JSON.parse(JSON.stringify(params.data)) : undefined,
      },
    });

    return {
      success: true,
      notificationId: record.id,
    };
  }
}

export function getNotificationAdapter(): INotificationAdapter {
  return new MockNotificationAdapter();
}

