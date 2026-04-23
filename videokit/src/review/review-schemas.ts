import {z} from "zod";

export const reviewSeveritySchema = z.enum([
	"info",
	"low",
	"medium",
	"high",
	"critical",
]);

export const reviewCategorySchema = z.enum([
	"subtitle",
	"timing",
	"audio",
	"visual",
	"asset",
	"rights",
	"structure",
]);

export const reviewIssueTypeSchema = z.enum([
	"scene-too-short",
	"scene-too-long",
	"text-pacing-fast",
	"text-pacing-slow",
	"subtitle-layout-risk",
	"subtitle-multi-page",
	"popup-duration-short",
	"component-hold-risk",
	"transition-flash-risk",
	"bgm-missing",
	"bgm-change-dense",
	"missing-background",
	"missing-voice-file",
	"missing-asset-file",
	"chat-message-dense",
	"gameplay-trim-missing",
]);

export const reviewTargetLayerSchema = z.enum([
	"script",
	"subtitle",
	"audio",
	"visual",
	"assets",
	"timing",
	"transition",
	"rights",
	"editor",
	"project",
]);

export const reviewSuggestedActionSchema = z.enum([
	"split-scene",
	"merge-scene",
	"extend-scene",
	"shorten-text",
	"rewrite-text",
	"reduce-font-size",
	"adjust-subtitle-box",
	"extend-popup",
	"hold-component-longer",
	"change-transition",
	"change-bgm",
	"lower-bgm",
	"reduce-se",
	"add-silence",
	"generate-voice",
	"replace-asset",
	"verify-asset",
	"manual-review",
	"keep-as-is",
	"adjust-chat-timing",
	"adjust-gameplay-trim",
]);

export const reviewTimeRangeSchema = z.object({
	startFrame: z.number().int().nonnegative(),
	endFrame: z.number().int().nonnegative(),
	startTimecode: z.string().min(1),
	endTimecode: z.string().min(1),
});

export const reviewMetricValueSchema = z.union([
	z.number(),
	z.string(),
	z.boolean(),
]);

export const reviewIssueSchema = z.object({
	id: z.string().min(1),
	category: reviewCategorySchema,
	type: reviewIssueTypeSchema,
	severity: reviewSeveritySchema,
	title: z.string().min(1),
	description: z.string().min(1),
	sceneId: z.string().optional(),
	sceneIndex: z.number().int().nonnegative().optional(),
	targetLayer: reviewTargetLayerSchema,
	suggestedActions: z.array(reviewSuggestedActionSchema).min(1),
	timeRange: reviewTimeRangeSchema,
	metrics: z.record(z.string(), reviewMetricValueSchema).default({}),
	blocking: z.boolean().default(false),
});

export const reviewReportSchema = z.object({
	version: z.literal(1),
	generatedAt: z.string().datetime(),
	scriptPath: z.string().min(1),
	variant: z.enum(["long", "short"]),
	templateId: z.string().min(1),
	output: z.object({
		width: z.number().int().positive(),
		height: z.number().int().positive(),
		fps: z.number().int().positive(),
		orientation: z.enum(["landscape", "portrait"]),
	}),
	summary: z.object({
		totalItems: z.number().int().nonnegative(),
		totalFrames: z.number().int().nonnegative(),
		totalSeconds: z.number().nonnegative(),
		issueCount: z.number().int().nonnegative(),
		blockingCount: z.number().int().nonnegative(),
		bySeverity: z.record(reviewSeveritySchema, z.number().int().nonnegative()),
		byCategory: z.record(reviewCategorySchema, z.number().int().nonnegative()),
	}),
	issues: z.array(reviewIssueSchema),
});

export const feedbackStatusSchema = z.enum([
	"open",
	"accepted",
	"rejected",
	"done",
	"needs-agent",
]);

export const feedbackPrioritySchema = z.enum([
	"low",
	"medium",
	"high",
]);

export const reviewFeedbackPatchSchema = z.object({
	durationDeltaFrames: z.number().int().optional(),
	durationFrames: z.number().int().positive().optional(),
	popupIndex: z.number().int().nonnegative().optional(),
	popupDurationDeltaFrames: z.number().int().optional(),
	popupDurationFrames: z.number().int().positive().optional(),
	subtitleWidth: z.number().min(1).max(100).optional(),
	subtitleFontSize: z.number().positive().optional(),
	replacementText: z.string().min(1).optional(),
	backgroundImage: z.string().min(1).optional(),
	backgroundVideo: z.string().min(1).optional(),
	popupImage: z.string().min(1).optional(),
	voiceFile: z.string().min(1).optional(),
	bgmFile: z.string().min(1).optional(),
	bgmVolume: z.number().min(0).max(1).optional(),
	transitionType: z.string().min(1).optional(),
	holdUntilSceneEnd: z.boolean().optional(),
	gameplayTrimBefore: z.number().int().nonnegative().optional(),
	gameplaySourceDuration: z.number().int().positive().optional(),
}).partial();

export const reviewFeedbackItemSchema = z.object({
	id: z.string().min(1),
	issueId: z.string().optional(),
	status: feedbackStatusSchema.default("open"),
	priority: feedbackPrioritySchema.default("medium"),
	sceneId: z.string().optional(),
	targetLayer: reviewTargetLayerSchema,
	action: reviewSuggestedActionSchema,
	timeRange: reviewTimeRangeSchema.optional(),
	comment: z.string().min(1),
	desiredOutcome: z.string().optional(),
	patch: reviewFeedbackPatchSchema.optional(),
});

export const reviewFeedbackSchema = z.object({
	version: z.literal(1),
	createdAt: z.string().datetime(),
	reportPath: z.string().min(1),
	variant: z.enum(["long", "short"]),
	templateId: z.string().min(1),
	items: z.array(reviewFeedbackItemSchema),
});

export type ReviewSeverity = z.infer<typeof reviewSeveritySchema>;
export type ReviewCategory = z.infer<typeof reviewCategorySchema>;
export type ReviewIssueType = z.infer<typeof reviewIssueTypeSchema>;
export type ReviewTargetLayer = z.infer<typeof reviewTargetLayerSchema>;
export type ReviewSuggestedAction = z.infer<typeof reviewSuggestedActionSchema>;
export type ReviewIssue = z.infer<typeof reviewIssueSchema>;
export type ReviewReport = z.infer<typeof reviewReportSchema>;
export type ReviewFeedbackPatch = z.infer<typeof reviewFeedbackPatchSchema>;
export type ReviewFeedbackItem = z.infer<typeof reviewFeedbackItemSchema>;
export type ReviewFeedback = z.infer<typeof reviewFeedbackSchema>;
