module.exports = function (eleventyConfig) {
  // Inlines data (like the analytics referrer allow list) into inline scripts.
  eleventyConfig.addFilter("json", (value) => JSON.stringify(value));

  // Everything in public/ is served from the site root.
  eleventyConfig.addPassthroughCopy({ public: "." });

  return {
    dir: {
      input: "src",
      output: "dist",
    },
  };
};
