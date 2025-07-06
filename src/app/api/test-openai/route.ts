import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log('Testing OpenAI API with message:', message);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "당신은 카페24 쇼핑몰의 고객서비스 담당자입니다. 친절하고 정확한 답변을 제공해주세요."
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      message: message,
      response: response,
      model: completion.model,
      usage: completion.usage,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'OpenAI API 호출 중 오류가 발생했습니다.',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'OpenAI API 테스트 엔드포인트입니다. POST 요청으로 메시지를 보내주세요.',
    example: {
      method: 'POST',
      body: {
        message: '배송은 언제 되나요?'
      }
    }
  });
}
