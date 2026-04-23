import fetch from "node-fetch";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";
import {loadLocalEnv} from "./env-utils.mjs";

loadLocalEnv();

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const registryPath = path.join(projectRoot, "config", "asset-source-registry.json");
const defaultManifestPath = path.join(
	projectRoot,
	"assets-manifest.generated.json",
);
const defaultDownloadDir = path.join(
	projectRoot,
	"public",
	"assets",
	"imported",
);

const readJsonFile = async (filePath) => {
	const raw = await readFile(filePath, "utf8");
	return JSON.parse(raw);
};

const parseArgs = (argv) => {
	const parsed = {
		source: "",
		type: "image",
		query: "",
		limit: 5,
		download: false,
		output: defaultManifestPath,
		downloadDir: defaultDownloadDir,
	};

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === "--source") {
			parsed.source = argv[i + 1] ?? "";
			i += 1;
			continue;
		}
		if (arg === "--type") {
			parsed.type = argv[i + 1] ?? "image";
			i += 1;
			continue;
		}
		if (arg === "--query") {
			parsed.query = argv[i + 1] ?? "";
			i += 1;
			continue;
		}
		if (arg === "--limit") {
			parsed.limit = Number(argv[i + 1] ?? "5");
			i += 1;
			continue;
		}
		if (arg === "--output") {
			parsed.output = path.resolve(projectRoot, argv[i + 1] ?? "");
			i += 1;
			continue;
		}
		if (arg === "--download-dir") {
			parsed.downloadDir = path.resolve(projectRoot, argv[i + 1] ?? "");
			i += 1;
			continue;
		}
		if (arg === "--download") {
			parsed.download = true;
		}
	}

	return parsed;
};

const sanitizeSlug = (value) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 72) || "asset";

const stripHtml = (value) =>
	(value ?? "")
		.replace(/<[^>]+>/g, " ")
		.replace(/&quot;/g, "\"")
		.replace(/&#039;/g, "'")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/\s+/g, " ")
		.trim();

const buildAttributionText = ({
	author,
	provider,
	pageUrl,
	licenseName,
}) => {
	const parts = [];
	if (author) {
		parts.push(author);
	}
	parts.push(provider);
	if (licenseName) {
		parts.push(licenseName);
	}
	parts.push(pageUrl);
	return parts.filter(Boolean).join(" | ");
};

const getRegistrySource = (registry, sourceId) => {
	const found = registry.sources.find((source) => source.id === sourceId);
	if (!found) {
		throw new Error(`Unknown source: ${sourceId}`);
	}
	return found;
};

const requireEnv = (name) => {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} is required for this source`);
	}
	return value;
};

const buildRequestHeaders = (extraHeaders = {}) => ({
	"User-Agent": "movie-maker-assets-fetch/1.0 (Remotion tooling)",
	...extraHeaders,
});

const fetchJson = async (url, options = {}) => {
	const response = await fetch(url, {
		...options,
		headers: buildRequestHeaders(options.headers),
	});
	if (!response.ok) {
		throw new Error(`HTTP ${response.status} from ${url}`);
	}
	return response.json();
};

const mapPixabayImage = (query, hit) => {
	const provider = "Pixabay";
	const pageUrl = hit.pageURL;
	const author = hit.user || undefined;
	const licenseName = "Pixabay Content License";
	return {
		id: `pixabay-${hit.id}`,
		query,
		assetType: "image",
		sourceId: "pixabay",
		sourcePageUrl: pageUrl,
		originalUrl: hit.largeImageURL || hit.webformatURL,
		width: hit.imageWidth || undefined,
		height: hit.imageHeight || undefined,
		license: {
			name: licenseName,
			url: "https://pixabay.com/service/license-summary/",
			attributionRequired: false,
			shareAlike: false,
			noDerivatives: false,
			nonCommercial: false,
			sourceTermsUrl: "https://pixabay.com/service/license-summary/",
		},
		attribution: {
			required: false,
			author,
			provider,
			providerUrl: "https://pixabay.com/",
			pageUrl,
			text: buildAttributionText({author, provider, pageUrl, licenseName}),
		},
		review: {
			status: "candidate",
			reason:
				"Stock asset candidate. Check trademarks, product shots, and identifiable people before publication.",
		},
		fetchedAt: new Date().toISOString(),
		tags: String(hit.tags ?? "")
			.split(",")
			.map((tag) => tag.trim())
			.filter(Boolean),
	};
};

const mapPixabayVideo = (query, hit) => {
	const provider = "Pixabay";
	const pageUrl = hit.pageURL;
	const author = hit.user || undefined;
	const video =
		hit.videos?.large ?? hit.videos?.medium ?? hit.videos?.small ?? null;
	if (!video?.url) {
		return null;
	}
	const licenseName = "Pixabay Content License";
	return {
		id: `pixabay-${hit.id}`,
		query,
		assetType: "video",
		sourceId: "pixabay",
		sourcePageUrl: pageUrl,
		originalUrl: video.url,
		width: video.width || undefined,
		height: video.height || undefined,
		durationSeconds: hit.duration || undefined,
		license: {
			name: licenseName,
			url: "https://pixabay.com/service/license-summary/",
			attributionRequired: false,
			shareAlike: false,
			noDerivatives: false,
			nonCommercial: false,
			sourceTermsUrl: "https://pixabay.com/service/license-summary/",
		},
		attribution: {
			required: false,
			author,
			provider,
			providerUrl: "https://pixabay.com/",
			pageUrl,
			text: buildAttributionText({author, provider, pageUrl, licenseName}),
		},
		review: {
			status: "candidate",
			reason:
				"Stock video candidate. Review brands, people, and depicted locations before use.",
		},
		fetchedAt: new Date().toISOString(),
		tags: String(hit.tags ?? "")
			.split(",")
			.map((tag) => tag.trim())
			.filter(Boolean),
	};
};

const searchPixabay = async ({query, limit, assetType}) => {
	const key = requireEnv("PIXABAY_API_KEY");
	const endpoint =
		assetType === "video"
			? "https://pixabay.com/api/videos/"
			: "https://pixabay.com/api/";
	const params = new URLSearchParams({
		key,
		q: query,
		per_page: String(limit),
		safesearch: "true",
	});
	const data = await fetchJson(`${endpoint}?${params.toString()}`);
	const hits = Array.isArray(data.hits) ? data.hits : [];
	return hits
		.map((hit) =>
			assetType === "video"
				? mapPixabayVideo(query, hit)
				: mapPixabayImage(query, hit),
		)
		.filter(Boolean);
};

const pickPexelsVideoFile = (videoFiles) => {
	const sorted = [...videoFiles].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
	return sorted[0] ?? null;
};

const searchPexels = async ({query, limit, assetType}) => {
	const key = requireEnv("PEXELS_API_KEY");
	const endpoint =
		assetType === "video"
			? "https://api.pexels.com/videos/search"
			: "https://api.pexels.com/v1/search";
	const params = new URLSearchParams({
		query,
		per_page: String(limit),
	});
	const data = await fetchJson(`${endpoint}?${params.toString()}`, {
		headers: {
			Authorization: key,
		},
	});
	if (assetType === "video") {
		return (data.videos ?? [])
			.map((video) => {
				const selected = pickPexelsVideoFile(video.video_files ?? []);
				if (!selected?.link) {
					return null;
				}
				const provider = "Pexels";
				const pageUrl = video.url;
				const author = video.user?.name || undefined;
				const licenseName = "Pexels License";
				return {
					id: `pexels-video-${video.id}`,
					query,
					assetType: "video",
					sourceId: "pexels",
					sourcePageUrl: pageUrl,
					originalUrl: selected.link,
					width: selected.width || undefined,
					height: selected.height || undefined,
					durationSeconds: video.duration || undefined,
					license: {
						name: licenseName,
						url: "https://www.pexels.com/license/",
						attributionRequired: false,
						shareAlike: false,
						noDerivatives: false,
						nonCommercial: false,
						sourceTermsUrl: "https://www.pexels.com/license/",
					},
					attribution: {
						required: false,
						author,
						provider,
						providerUrl: "https://www.pexels.com/",
						pageUrl,
						text: buildAttributionText({
							author,
							provider,
							pageUrl,
							licenseName,
						}),
					},
					review: {
						status: "candidate",
						reason:
							"Supplemental stock footage. Keep creator credit in the manifest and review identifiable people or brands.",
					},
					fetchedAt: new Date().toISOString(),
					tags: [],
				};
			})
			.filter(Boolean);
	}

	return (data.photos ?? []).map((photo) => {
		const provider = "Pexels";
		const pageUrl = photo.url;
		const author = photo.photographer || undefined;
		const licenseName = "Pexels License";
		return {
			id: `pexels-photo-${photo.id}`,
			query,
			assetType: "image",
			sourceId: "pexels",
			sourcePageUrl: pageUrl,
			originalUrl: photo.src?.original || photo.src?.large2x || photo.src?.large,
			width: photo.width || undefined,
			height: photo.height || undefined,
			license: {
				name: licenseName,
				url: "https://www.pexels.com/license/",
				attributionRequired: false,
				shareAlike: false,
				noDerivatives: false,
				nonCommercial: false,
				sourceTermsUrl: "https://www.pexels.com/license/",
			},
			attribution: {
				required: false,
				author,
				provider,
				providerUrl: "https://www.pexels.com/",
				pageUrl,
				text: buildAttributionText({author, provider, pageUrl, licenseName}),
			},
			review: {
				status: "candidate",
				reason:
					"Supplemental stock image. Review people, private property, and implied endorsement risks.",
			},
			fetchedAt: new Date().toISOString(),
			tags: [],
		};
	});
};

const searchUnsplash = async ({query, limit, assetType, download}) => {
	if (assetType !== "image") {
		throw new Error("Unsplash search is limited to images in this script");
	}
	if (download) {
		throw new Error(
			"Unsplash is configured as review-first. Do not use --download with this source.",
		);
	}
	const key = requireEnv("UNSPLASH_ACCESS_KEY");
	const params = new URLSearchParams({
		query,
		per_page: String(limit),
		client_id: key,
	});
	const data = await fetchJson(
		`https://api.unsplash.com/search/photos?${params.toString()}`,
	);
	return (data.results ?? []).map((item) => {
		const provider = "Unsplash";
		const pageUrl = item.links?.html;
		const author = item.user?.name || undefined;
		const licenseName = "Unsplash License";
		return {
			id: `unsplash-${item.id}`,
			query,
			assetType: "image",
			sourceId: "unsplash",
			sourcePageUrl: pageUrl,
			originalUrl: item.urls?.regular || item.urls?.full,
			width: item.width || undefined,
			height: item.height || undefined,
			license: {
				name: licenseName,
				url: "https://unsplash.com/license",
				attributionRequired: true,
				shareAlike: false,
				noDerivatives: false,
				nonCommercial: false,
				sourceTermsUrl: "https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines",
			},
			attribution: {
				required: true,
				author,
				authorUrl: item.user?.links?.html || undefined,
				provider,
				providerUrl: "https://unsplash.com/",
				pageUrl,
				text: buildAttributionText({author, provider, pageUrl, licenseName}),
			},
			review: {
				status: "needs_review",
				reason:
					"Unsplash API results are review-first here. Preserve attribution and follow API hotlinking and tracking rules.",
			},
			fetchedAt: new Date().toISOString(),
			tags: (item.tags ?? []).map((tag) => tag.title).filter(Boolean),
		};
	});
};

const extractMetadataField = (extmetadata, key) =>
	stripHtml(extmetadata?.[key]?.value ?? "");

const searchWikimediaCommons = async ({query, limit, assetType}) => {
	if (assetType !== "image") {
		throw new Error("Wikimedia Commons search is limited to images in this script");
	}
	const searchParams = new URLSearchParams({
		action: "query",
		list: "search",
		srsearch: query,
		srnamespace: "6",
		srlimit: String(limit),
		format: "json",
		formatversion: "2",
		origin: "*",
	});
	const searchData = await fetchJson(
		`https://commons.wikimedia.org/w/api.php?${searchParams.toString()}`,
	);
	const titles = (searchData.query?.search ?? []).map((entry) => entry.title);
	if (!titles.length) {
		return [];
	}
	const imageInfoParams = new URLSearchParams({
		action: "query",
		prop: "imageinfo",
		titles: titles.join("|"),
		iiprop: "url|size|extmetadata",
		iiurlwidth: "1920",
		format: "json",
		formatversion: "2",
		origin: "*",
	});
	const imageInfoData = await fetchJson(
		`https://commons.wikimedia.org/w/api.php?${imageInfoParams.toString()}`,
	);
	return (imageInfoData.query?.pages ?? [])
		.map((page) => {
			const info = page.imageinfo?.[0];
			if (!info?.url || !page.title) {
				return null;
			}
			const extmetadata = info.extmetadata ?? {};
			const provider = "Wikimedia Commons";
			const pageUrl = `https://commons.wikimedia.org/wiki/${encodeURI(
				page.title.replace(/ /g, "_"),
			)}`;
			const author = extractMetadataField(extmetadata, "Artist") || undefined;
			const licenseName =
				extractMetadataField(extmetadata, "LicenseShortName") || "See file page";
			const licenseUrl =
				extractMetadataField(extmetadata, "LicenseUrl") || undefined;
			const attributionText =
				extractMetadataField(extmetadata, "Attribution") ||
				buildAttributionText({author, provider, pageUrl, licenseName});
			return {
				id: `commons-${sanitizeSlug(page.title)}`,
				query,
				assetType: "image",
				sourceId: "wikimedia-commons",
				sourcePageUrl: pageUrl,
				originalUrl: info.url,
				downloadUrl: info.thumburl || info.url,
				width: info.width || undefined,
				height: info.height || undefined,
				license: {
					name: licenseName,
					url: licenseUrl,
					raw: JSON.stringify(extmetadata),
					attributionRequired: true,
					shareAlike: /sharealike|sa/i.test(licenseName),
					noDerivatives: /no derivatives|nd/i.test(licenseName),
					nonCommercial: /noncommercial|nc/i.test(licenseName),
					sourceTermsUrl:
						"https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia",
				},
				attribution: {
					required: true,
					author,
					provider,
					providerUrl: "https://commons.wikimedia.org/",
					pageUrl,
					text: attributionText,
				},
				review: {
					status: "needs_review",
					reason:
						"Commons file found. Verify the file-specific license and any non-copyright restrictions before publishing.",
				},
				fetchedAt: new Date().toISOString(),
				tags: [],
			};
		})
		.filter(Boolean);
};

const searchAssets = async ({sourceId, query, limit, assetType, download}) => {
	if (sourceId === "pixabay") {
		return searchPixabay({query, limit, assetType});
	}
	if (sourceId === "pexels") {
		return searchPexels({query, limit, assetType});
	}
	if (sourceId === "unsplash") {
		return searchUnsplash({query, limit, assetType, download});
	}
	if (sourceId === "wikimedia-commons") {
		return searchWikimediaCommons({query, limit, assetType});
	}
	throw new Error(
		`Source ${sourceId} is not automated. Use official press materials manually and record them in the manifest.`,
	);
};

const downloadAssets = async ({items, targetDir, projectRelativeBase}) => {
	await mkdir(targetDir, {recursive: true});
	const downloadedItems = [];

	for (let index = 0; index < items.length; index += 1) {
		const item = items[index];
		const downloadUrl = item.downloadUrl || item.originalUrl;
		const url = new URL(downloadUrl);
		const extension = path.extname(url.pathname) || (item.assetType === "video" ? ".mp4" : ".jpg");
		const fileName = `${String(index + 1).padStart(2, "0")}-${sanitizeSlug(item.id)}${extension}`;
		const absolutePath = path.join(targetDir, fileName);
		const response = await fetch(downloadUrl, {
			headers: buildRequestHeaders({
				Accept: "*/*",
			}),
		});
		if (!response.ok) {
			throw new Error(`Failed to download ${downloadUrl}`);
		}
		const buffer = Buffer.from(await response.arrayBuffer());
		await writeFile(absolutePath, buffer);
		downloadedItems.push({
			...item,
			localPath: path
				.join(projectRelativeBase, fileName)
				.replace(/\\/g, "/"),
		});
	}

	return downloadedItems;
};

const main = async () => {
	const args = parseArgs(process.argv.slice(2));
	if (!args.source || !args.query) {
		throw new Error(
			"Usage: node scripts/fetch-assets.mjs --source <id> --type <image|video> --query <text> [--limit 5] [--download]",
		);
	}
	if (!["image", "video"].includes(args.type)) {
		throw new Error(`Unsupported --type value: ${args.type}`);
	}
	if (!Number.isFinite(args.limit) || args.limit <= 0) {
		throw new Error("--limit must be a positive number");
	}

	const registry = await readJsonFile(registryPath);
	const source = getRegistrySource(registry, args.source);
	if (
		args.download &&
		!["local-download-allowed", "local-download-recommended"].includes(
			source.downloadPolicy,
		)
	) {
		throw new Error(
			`${args.source} is configured as ${source.downloadPolicy}, so --download is disabled.`,
		);
	}

	const items = await searchAssets({
		sourceId: args.source,
		query: args.query,
		limit: args.limit,
		assetType: args.type,
		download: args.download,
	});

	let finalItems = items;
	if (args.download) {
		const targetDir = path.join(args.downloadDir, args.source);
		finalItems = await downloadAssets({
			items,
			targetDir,
			projectRelativeBase: path.relative(projectRoot, targetDir),
		});
	}

	const manifest = {
		version: 1,
		generatedAt: new Date().toISOString(),
		query: args.query,
		assetType: args.type,
		sourceId: args.source,
		downloaded: args.download,
		items: finalItems,
	};

	await writeFile(args.output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
	process.stdout.write(
		`${JSON.stringify(
			{
				source: args.source,
				query: args.query,
				count: finalItems.length,
				downloaded: args.download,
				output: args.output,
			},
			null,
			2,
		)}\n`,
	);
};

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
