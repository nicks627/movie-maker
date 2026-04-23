import {z} from "zod";

export const assetSourceRegistrySchema = z.object({
	version: z.number().int().positive(),
	defaultSourceOrder: z.array(z.string().min(1)),
	sources: z.array(
		z.object({
			id: z.string().min(1),
			label: z.string().min(1),
			category: z.enum(["official", "commons", "stock"]),
			automationLevel: z.enum([
				"manual-review-first",
				"search-and-download",
				"search-and-download-with-review",
				"search-and-download-with-attribution",
				"search-metadata-review-first",
			]),
			downloadPolicy: z.enum([
				"manual-only",
				"local-download-allowed",
				"local-download-recommended",
				"api-hotlink-required",
			]),
			attributionPolicy: z.enum([
				"follow-source-terms",
				"per-file-license",
				"not-required-but-store-source",
				"store-credit-and-linkback",
				"required-for-api-usage",
			]),
			recommendedFor: z.array(z.string().min(1)),
			reviewChecklist: z.array(z.string().min(1)),
			api: z
				.object({
					baseUrl: z.string().url(),
					videoBaseUrl: z.string().url().optional(),
					authEnv: z.string().min(1).optional(),
					docs: z.array(z.string().url()).default([]),
				})
				.optional(),
			docs: z
				.array(
					z.object({
						label: z.string().min(1),
						url: z.string().url(),
					}),
				)
				.optional(),
		}),
	),
});

export const assetLicenseSchema = z.object({
	name: z.string().min(1),
	url: z.string().url().optional(),
	raw: z.string().optional(),
	attributionRequired: z.boolean(),
	shareAlike: z.boolean().default(false),
	noDerivatives: z.boolean().default(false),
	nonCommercial: z.boolean().default(false),
	sourceTermsUrl: z.string().url().optional(),
});

export const assetAttributionSchema = z.object({
	required: z.boolean(),
	author: z.string().optional(),
	authorUrl: z.string().url().optional(),
	provider: z.string().min(1),
	providerUrl: z.string().url().optional(),
	pageUrl: z.string().url(),
	text: z.string().min(1),
});

export const assetReviewSchema = z.object({
	status: z.enum([
		"candidate",
		"approved",
		"needs_review",
		"rejected",
		"license_blocked",
	]),
	reason: z.string().min(1),
	reviewer: z.string().optional(),
	reviewedAt: z.string().datetime().optional(),
});

export const fetchedAssetSchema = z.object({
	id: z.string().min(1),
	query: z.string().min(1),
	assetType: z.enum(["image", "video"]),
	sourceId: z.string().min(1),
	sourcePageUrl: z.string().url(),
	originalUrl: z.string().url(),
	localPath: z.string().optional(),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
	durationSeconds: z.number().positive().optional(),
	license: assetLicenseSchema,
	attribution: assetAttributionSchema,
	review: assetReviewSchema,
	fetchedAt: z.string().datetime(),
	tags: z.array(z.string()).default([]),
});

export const assetManifestSchema = z.object({
	version: z.literal(1),
	generatedAt: z.string().datetime(),
	query: z.string().min(1),
	assetType: z.enum(["image", "video"]),
	sourceId: z.string().min(1),
	downloaded: z.boolean(),
	items: z.array(fetchedAssetSchema),
});

export type AssetSourceRegistry = z.infer<typeof assetSourceRegistrySchema>;
export type AssetSourceDefinition = AssetSourceRegistry["sources"][number];
export type AssetLicense = z.infer<typeof assetLicenseSchema>;
export type AssetAttribution = z.infer<typeof assetAttributionSchema>;
export type AssetReview = z.infer<typeof assetReviewSchema>;
export type FetchedAsset = z.infer<typeof fetchedAssetSchema>;
export type AssetManifest = z.infer<typeof assetManifestSchema>;

export const parseAssetSourceRegistry = (input: unknown) =>
	assetSourceRegistrySchema.parse(input);

export const parseAssetManifest = (input: unknown) =>
	assetManifestSchema.parse(input);

export const getAssetSourceById = (
	registry: AssetSourceRegistry,
	sourceId: string,
) => registry.sources.find((source) => source.id === sourceId);

export const canAutoDownloadSource = (
	registry: AssetSourceRegistry,
	sourceId: string,
) => {
	const source = getAssetSourceById(registry, sourceId);
	return source?.downloadPolicy === "local-download-allowed" ||
		source?.downloadPolicy === "local-download-recommended";
};
