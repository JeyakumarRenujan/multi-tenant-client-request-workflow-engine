import { NextFunction, Request, Response } from "express";
import { listClients } from "./client.service";
import { listClientsSchema } from "./client.validation";

export async function listClientsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = listClientsSchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid client filters",
        errors: parsed.error.flatten().fieldErrors
      });
      return;
    }

    const result = await listClients(parsed.data, req.authUser!);

    res.status(200).json({
      success: true,
      message: "Clients retrieved successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
}
