import { blockJack } from "actions/blockJack";
import { getUsersRoles } from "actions/getUsersRoles";
import { removeAdminRole } from "src/lib/auth0";
import { isUserAdmin } from "actions/isUserAdmin";

export const POST = async (req: Request) => {

  const roles = await blockJack();
  console.log("roles:", roles)

  try {

    const admin = await isUserAdmin();

    if (!admin) {
      return Response.json({ error: 'Unauthorized' }, { status: 400 });
    }

    const { userId } = await req.json();

    if (!userId) {
      return Response.json({ error: 'User ID is required' }, { status: 400 });
    }

    await removeAdminRole(userId);

    return Response.json({ message: 'Admin role removed' }, { status: 200 });
  } catch (error) {
    console.error('Error removing admin role:', error);
    return Response.json({ error: 'Failed to remove admin role' }, { status: 500 });
  }
};
