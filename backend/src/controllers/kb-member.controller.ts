import type { Request, Response } from "express";
import * as kbMemberService from "../services/kb-member.service.js";

export async function listMembers(req: Request, res: Response) {
  const members = await kbMemberService.getKbMembers(
    req.params.id as string,
  );

  res.json({
    success: true,
    data: members,
  });
}

export async function addMember(req: Request, res: Response) {
  const { userId, role } = req.body;

  const member = await kbMemberService.addKbMember(
    req.params.id as string,
    userId,
    role,
  );

  res.status(201).json({
    success: true,
    data: member,
  });
}

export async function removeMember(req: Request, res: Response) {
  await kbMemberService.removeKbMember(
    req.params.id as string,
    req.params.userId as string,
  );

  res.json({
    success: true,
  });
}

export async function updateMemberRole(req: Request, res: Response) {
  const { role } = req.body;

  const member = await kbMemberService.changeKbMemberRole(
    req.params.id as string,
    req.params.userId as string,
    role,
  );

  res.json({
    success: true,
    data: member,
  });
}