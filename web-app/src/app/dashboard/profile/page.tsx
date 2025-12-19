import { getAuthenticatedUser } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateUserProfile, changePassword } from "@/app/actions";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
    const user = await getAuthenticatedUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Profile Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>Update your public profile details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4 mb-6">
                            <Avatar className="h-20 w-20">
                                <AvatarImage src={user.image || ""} alt={user.name || ""} />
                                <AvatarFallback className="text-lg">{user.name?.charAt(0) || "U"}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 className="font-medium text-lg">{user.name}</h3>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 mt-1">
                                    {user.role}
                                </span>
                            </div>
                        </div>

                        <form action={async (formData: FormData) => {
                            "use server";
                            const name = formData.get("name") as string;
                            const image = formData.get("image") as string;
                            await updateUserProfile({ name, image });
                        }} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Display Name</Label>
                                <Input id="name" name="name" defaultValue={user.name || ""} placeholder="Your Name" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="image">Avatar URL</Label>
                                <Input id="image" name="image" defaultValue={user.image || ""} placeholder="https://example.com/avatar.jpg" />
                            </div>
                            <Button type="submit">Save Changes</Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Security */}
                <Card>
                    <CardHeader>
                        <CardTitle>Security</CardTitle>
                        <CardDescription>Manage your password and security settings.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={async (formData: FormData) => {
                            "use server";
                            const currentPassword = formData.get("currentPassword") as string;
                            const newPassword = formData.get("newPassword") as string;
                            const confirmPassword = formData.get("confirmPassword") as string;

                            if (newPassword !== confirmPassword) {
                                // In a real app, return error to UI
                                throw new Error("Passwords do not match");
                            }

                            await changePassword(currentPassword, newPassword);
                        }} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Current Password</Label>
                                <Input id="currentPassword" name="currentPassword" type="password" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input id="newPassword" name="newPassword" type="password" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                <Input id="confirmPassword" name="confirmPassword" type="password" required />
                            </div>
                            <Button type="submit" variant="secondary">Change Password</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
