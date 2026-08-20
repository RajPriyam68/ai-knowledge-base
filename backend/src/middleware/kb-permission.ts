import type { NextFunction, Request, Response } from "express";
import { findKbMemberRole } from "../repositories/kb-member.repo.js";

type KbRole = "OWNER" | "EDITOR" | "VIEWER";

export function requireKbRole(...allowedRoles: KbRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const kbId = req.params.id as string;
      const userId = req.user?.id;

      if (!kbId || !userId) {
        return res.status(400).json({
          success: false,
          message: "Knowledge base and user are required",
        });
      }

      const role = await findKbMemberRole(kbId, userId);
      console.log("[KB PERMISSION]", {
  kbId,
  userId,
  role,
  allowedRoles,
});

      if (!role || !allowedRoles.includes(role as KbRole)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action",
        });
      }

     
      next();
    } catch (error) {
      next(error);
    }
  };
}