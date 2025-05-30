import { getUsersRoles } from "actions/getUsersRoles";
import { assignAdminRole } from "src/lib/auth0";
import { blockJack } from "actions/blockJack";
import { isUserAdmin } from "actions/isUserAdmin";

export const POST = async (req: Request) => {

  //const roles = await blockJack();
  //console.log("roles:", roles)

  try {
    const { userId } = await req.json();
    const admin = await isUserAdmin();

    if (!admin) {
      return Response.json({error: 'Unauthorized'}, {status: 400});
    }

    if (!userId) {
      return Response.json({ error: 'User ID is required' }, { status: 400 });
    }

    await assignAdminRole(userId);

    return Response.json({ message: 'Admin role assigned' }, { status: 200 });
  } catch (error) {
    console.error('Error assigning admin role:', error);
    return Response.json({ error: 'Failed to assign admin role' }, { status: 500 });
  }
};

