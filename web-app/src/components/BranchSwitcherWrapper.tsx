
import { getOutlets } from "@/actions/settings";
import { BranchSwitcher } from "./BranchSwitcher";

// Server Component Wrapper to fetch data
export async function BranchSwitcherWrapper() {
    try {
        const outlets = await getOutlets();
        return <BranchSwitcher outlets={outlets} />;
    } catch (e) {
        return null;
    }
}
