import * as kbMemberRepo from "../repositories/kb-member.repo.js";

export async function getKbMembers(kbId: string) {
  return kbMemberRepo.listKbMembers(kbId);
}

export async function addKbMember(
  kbId: string,
  userId: string,
  role: "EDITOR" | "VIEWER",
) {
  return kbMemberRepo.createKbMember({
    kbId,
    userId,
    role,
  });
}

export async function removeKbMember(
  kbId: string,
  userId: string,
) {
  return kbMemberRepo.removeKbMember(kbId, userId);
}

export async function changeKbMemberRole(
  kbId: string,
  userId: string,
  role: "EDITOR" | "VIEWER",
) {
  return kbMemberRepo.updateKbMemberRole(kbId, userId, role);
}