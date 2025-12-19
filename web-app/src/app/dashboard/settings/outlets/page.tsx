
import { getOutlets } from "@/actions/settings";
import { OutletsView } from "./OutletsView";

export default async function OutletsPage() {
    const outlets = await getOutlets();
    return <OutletsView initialOutlets={outlets} />;
}
