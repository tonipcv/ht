import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

// POST - Registrar novo lead via referência
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const { name, phone, email, utmSource, utmMedium, utmCampaign, utmTerm, utmContent } = await req.json();

    // Validar dados obrigatórios
    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Nome e telefone são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar referência pelo slug
    const referral = await prisma.patientReferral.findUnique({
      where: { slug },
      include: {
        page: {
          select: {
            userId: true,
            id: true
          }
        }
      }
    });

    if (!referral) {
      return NextResponse.json(
        { error: 'Link de referência não encontrado' },
        { status: 404 }
      );
    }

    // Criar lead e atualizar contadores em uma transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar lead
      const lead = await tx.leads.create({
        data: {
          id: randomUUID(),
          name,
          email,
          phone,
          user_id: referral.page.userId,
          indicationId: referral.id,
          status: 'Novo',
          utmSource,
          utmMedium,
          utmCampaign,
          utmTerm,
          utmContent
        }
      });

      // Buscar recompensas não desbloqueadas do tipo LEADS
      const rewards = await tx.referralReward.findMany({
        where: {
          referralId: referral.id,
          unlockedAt: null,
          unlockType: 'LEADS'
        }
      });

      // Atualizar contagem de leads na referência
      const updatedReferral = await tx.patientReferral.update({
        where: { id: referral.id },
        data: {
          leads: {
            increment: 1
          }
        },
        select: {
          leads: true
        }
      });

      // Desbloquear recompensas que atingiram a meta
      if (rewards.length > 0) {
        const rewardsToUnlock = rewards.filter(reward => updatedReferral.leads >= reward.unlockValue);
        
        if (rewardsToUnlock.length > 0) {
          await tx.referralReward.updateMany({
            where: {
              id: {
                in: rewardsToUnlock.map(r => r.id)
              }
            },
            data: {
              unlockedAt: new Date()
            }
          });
        }
      }

      return lead;
    });

    return NextResponse.json({
      success: true,
      leadId: result.id
    });
  } catch (error) {
    console.error('Erro ao registrar lead:', error);
    return NextResponse.json(
      { error: 'Erro ao processar solicitação' },
      { status: 500 }
    );
  }
} 