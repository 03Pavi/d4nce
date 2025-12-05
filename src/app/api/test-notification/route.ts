import { NextResponse } from 'next/server';
import { sendNotification } from '@/lib/notifications';

export async function GET() {
  try {
    console.log('🧪 Testing notification system...');

    // Check if API key is available
    const hasApiKey = !!process.env.ONESIGNAL_API_KEY;
    console.log('API Key present:', hasApiKey);

    if (!hasApiKey) {
      return NextResponse.json({
        success: false,
        error: 'ONESIGNAL_API_KEY environment variable is not set',
        hint: 'Set this in Vercel Dashboard → Settings → Environment Variables'
      }, { status: 500 });
    }

    // Try to send a test notification
    const result = await sendNotification('🧪 Test notification from Vercel deployment', {
      headings: { en: '✅ Notification Test' },
      data: { type: 'test', timestamp: new Date().toISOString() },
    });

    console.log(result,'resultresultresult')
    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      result: {
        id: result.id,
        recipients: result.recipients,
        errors: result.errors
      }
    });
  } catch (error: any) {
    console.error('❌ Test notification failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.response?.data,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, userIds } = body;

    if (!message) {
      return NextResponse.json({
        success: false,
        error: 'Message is required'
      }, { status: 400 });
    }

    console.log('🧪 Sending test notification:', { message, userIds });

    const result = await sendNotification(message, {
      headings: { en: '🧪 Custom Test' },
      userIds: userIds || undefined,
      data: { type: 'custom_test', timestamp: new Date().toISOString() },
    });

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      result: {
        id: result.id,
        recipients: result.recipients,
        errors: result.errors
      }
    });
  } catch (error: any) {
    console.error('❌ Custom test notification failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.response?.data
    }, { status: 500 });
  }
}
