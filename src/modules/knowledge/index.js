import { Router } from "express";
import faqs from "./faqs/router.js";
import faqOrigins from "./faqs-origins/router.js";
import kbArticles from "./kb-articles/router.js";
import kbTags from "./kb-tags/router.js";
import kbTagMap from "./kb-tag-map/router.js";
import kbRatings from "./kb-ratings/router.js";
import videos from "./videos/router.js";
import videoCategories from "./video-categories/router.js";
import search from "./search/router.js";
const r = Router();
// Mount origins before faqs to avoid '/faqs/:id' catching '/faqs/origins'
r.use("/faqs/origins", faqOrigins);
r.use("/faqs", faqs);
r.use("/kb/articles", kbArticles);
// Ensure categories mounted before videos to prevent '/videos/:id' conflicts
r.use("/videos/categories", videoCategories);
r.use("/videos", videos);
r.use("/kb/tags", kbTags);
r.use("/kb/tag-map", kbTagMap);
r.use("/kb/ratings", kbRatings);
r.use("/search", search);
export default r;
