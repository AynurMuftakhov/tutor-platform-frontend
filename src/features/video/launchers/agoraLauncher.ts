import type { AgoraJoinPayload } from '../../../types/video';
import { EduRoomTypeEnum, EduRoleTypeEnum } from 'agora-edu-core';

export async function launchAgora(dom: HTMLElement, p: AgoraJoinPayload, roomName: string, userName: string, role: 'teacher'|'student') {
  const { AgoraEduSDK } = await import('agora-classroom-sdk');
  // Agora Flexible Classroom requires global config with your App ID (must match token issuer)
  const appId = (import.meta.env as any).VITE_AGORA_APP_ID as string | undefined;
  const region = ((import.meta.env as any).VITE_AGORA_REGION as string | undefined) ?? 'ap'; // 'cn' | 'ap' | 'us' | 'eu'
  if (!appId) {
    // Fail fast to avoid silent `/apps//v3` calls that return {"message":"appid is invalid"}
    throw new Error('VITE_AGORA_APP_ID is not set. Add it to your .env (e.g., VITE_AGORA_APP_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)');
  }
  if (p.appId && p.appId !== appId) {
    console.warn('[Agora] App ID mismatch: env VITE_AGORA_APP_ID != backend payload appId. Verify server token issuer matches client config.');
  }
  // Must be called before launch; SDK uses it to build EDU REST endpoints
  AgoraEduSDK.config({ appId, region });
  const roleType: EduRoleTypeEnum = role === 'teacher' ? EduRoleTypeEnum.teacher : EduRoleTypeEnum.student;

  // Provide required fields for LaunchOption per SDK typings
  return AgoraEduSDK.launch(dom, {
    rtmToken: p.rtmToken,
    roomUuid: p.roomUuid,
    roomName,
    userUuid: p.userUuid,
    userName,
    roleType,
    roomType: EduRoomTypeEnum.Room1v1Class,
    pretest: true,
    latencyLevel: 2,
    // Required fields missing previously
    listener: () => { /* noop: classroom events not handled in MVP */ },
    language: 'en',
    duration: 86400,
    courseWareList: [],
  });
}
