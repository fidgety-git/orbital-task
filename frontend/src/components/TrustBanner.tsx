import {
	AlertTriangle,
	CheckCircle2,
	HelpCircle,
	ShieldAlert,
} from "lucide-react";
import type { TrustLevel } from "../types";

interface TrustBannerProps {
	trustLevel: TrustLevel | null;
}

const TRUST_CONFIG: Record<
	TrustLevel,
	{
		label: string;
		description: string;
		className: string;
		icon: typeof CheckCircle2;
	}
> = {
	high: {
		label: "Verified sources",
		description: "All cited passages were matched to your uploaded documents.",
		className: "border-emerald-200 bg-emerald-50 text-emerald-800",
		icon: CheckCircle2,
	},
	partial: {
		label: "Partially verified",
		description:
			"Some citations matched your documents. Review unverified sources before relying on this answer.",
		className: "border-amber-200 bg-amber-50 text-amber-900",
		icon: AlertTriangle,
	},
	unverified: {
		label: "Not verified",
		description:
			"This answer could not be verified against your documents. Check the source PDFs before use.",
		className: "border-red-200 bg-red-50 text-red-800",
		icon: ShieldAlert,
	},
	not_found: {
		label: "Not in documents",
		description:
			"The assistant indicated this information is not in the uploaded documents.",
		className: "border-neutral-200 bg-neutral-50 text-neutral-700",
		icon: HelpCircle,
	},
};

export function TrustBanner({ trustLevel }: TrustBannerProps) {
	if (trustLevel == null) return null;

	const config = TRUST_CONFIG[trustLevel];
	const Icon = config.icon;

	return (
		<div
			className={`mb-2 flex items-start gap-2 rounded-lg border px-3 py-2 ${config.className}`}
		>
			<Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
			<div>
				<p className="text-xs font-medium">{config.label}</p>
				<p className="text-xs opacity-90">{config.description}</p>
			</div>
		</div>
	);
}
