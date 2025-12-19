import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

export default function IntegrationsPage() {
    const paystackEnabled = !!process.env.PAYSTACK_SECRET_KEY;
    const squadcoEnabled = !!process.env.SQUADCO_SECRET_KEY;
    const paystackTestEnabled = !!process.env.PAYSTACK_SECRET_KEY_TEST;
    const squadcoTestEnabled = !!process.env.SQUADCO_SECRET_KEY_TEST;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
                <p className="text-muted-foreground">Manage your payment providers and external services.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Paystack */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-xl">Paystack</CardTitle>
                            <CardDescription>Payment processing and virtual accounts</CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            {paystackEnabled ? (
                                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                    <CheckCircle2 className="mr-1 h-3 w-3" /> Live Connected
                                </Badge>
                            ) : (
                                <Badge variant="destructive">
                                    <AlertCircle className="mr-1 h-3 w-3" /> Live Not Configured
                                </Badge>
                            )}
                            {paystackTestEnabled ? (
                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                    <CheckCircle2 className="mr-1 h-3 w-3" /> Test Connected
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
                                    <AlertCircle className="mr-1 h-3 w-3" /> Test Missing
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500">
                                Paystack allows you to collect payments, make transfers, and generate dedicated virtual accounts for your customers.
                            </p>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <a href="https://dashboard.paystack.com/#/settings/developers" target="_blank" rel="noopener noreferrer">
                                        Get API Keys <ExternalLink className="ml-2 h-3 w-3" />
                                    </a>
                                </Button>
                                <div className="flex flex-col text-xs text-muted-foreground">
                                    {!paystackEnabled && <span>Set PAYSTACK_SECRET_KEY in .env</span>}
                                    {!paystackTestEnabled && <span>Set PAYSTACK_SECRET_KEY_TEST in .env</span>}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Squadco */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-xl">Squadco</CardTitle>
                            <CardDescription>Reliable payments and virtual accounts</CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            {squadcoEnabled ? (
                                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                    <CheckCircle2 className="mr-1 h-3 w-3" /> Live Connected
                                </Badge>
                            ) : (
                                <Badge variant="destructive">
                                    <AlertCircle className="mr-1 h-3 w-3" /> Live Not Configured
                                </Badge>
                            )}
                            {squadcoTestEnabled ? (
                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                    <CheckCircle2 className="mr-1 h-3 w-3" /> Test Connected
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
                                    <AlertCircle className="mr-1 h-3 w-3" /> Test Missing
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500">
                                Squadco provides robust payment infrastructure, virtual accounts, and USSD payment channels.
                            </p>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <a href="https://dashboard.squadco.com/settings/api" target="_blank" rel="noopener noreferrer">
                                        Get API Keys <ExternalLink className="ml-2 h-3 w-3" />
                                    </a>
                                </Button>
                                <div className="flex flex-col text-xs text-muted-foreground">
                                    {!squadcoEnabled && <span>Set SQUADCO_SECRET_KEY in .env</span>}
                                    {!squadcoTestEnabled && <span>Set SQUADCO_SECRET_KEY_TEST in .env</span>}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
