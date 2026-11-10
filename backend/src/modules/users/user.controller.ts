import { NextFunction, Request, Response } from "express";
import {
  createUser,
  listUsers,
  updateUser,
  updateUserStatus,
  UserManagementError
} from "./user.service";
import {
  createUserSchema,
  listUsersSchema,
  updateUserSchema,
  updateUserStatusSchema,
  userIdSchema
} from "./user.validation";

function sendUserError(
  error: unknown,
  res: Response,
  next: NextFunction
) {
  if (error instanceof UserManagementError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message
    });
    return;
  }

  next(error);
}

export async function createUserController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid user details",
        errors: parsed.error.flatten().fieldErrors
      });
      return;
    }

    const user = await createUser(parsed.data, req.authUser!);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: { user }
    });
  } catch (error) {
    sendUserError(error, res, next);
  }
}

export async function listUsersController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsed = listUsersSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid user filters",
        errors: parsed.error.flatten().fieldErrors
      });
      return;
    }

    const result = await listUsers(parsed.data, req.authUser!);

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: result
    });
  } catch (error) {
    sendUserError(error, res, next);
  }
}

export async function updateUserController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsedId = userIdSchema.safeParse(req.params.id);
    const parsedBody = updateUserSchema.safeParse(req.body);

    if (!parsedId.success || !parsedBody.success) {
      res.status(400).json({
        success: false,
        message: "Invalid user update details",
        errors: !parsedBody.success
          ? parsedBody.error.flatten().fieldErrors
          : { id: ["Invalid user ID"] }
      });
      return;
    }

    const user = await updateUser(
      parsedId.data,
      parsedBody.data,
      req.authUser!
    );

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: { user }
    });
  } catch (error) {
    sendUserError(error, res, next);
  }
}

export async function updateUserStatusController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const parsedId = userIdSchema.safeParse(req.params.id);
    const parsedBody = updateUserStatusSchema.safeParse(req.body);

    if (!parsedId.success || !parsedBody.success) {
      res.status(400).json({
        success: false,
        message: "Invalid user status details",
        errors: !parsedBody.success
          ? parsedBody.error.flatten().fieldErrors
          : { id: ["Invalid user ID"] }
      });
      return;
    }

    const user = await updateUserStatus(
      parsedId.data,
      parsedBody.data.isActive,
      req.authUser!
    );

    res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: { user }
    });
  } catch (error) {
    sendUserError(error, res, next);
  }
}
