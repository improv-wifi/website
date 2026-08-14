module.exports = function (eleventyConfig) {
  // Inlines data (like the analytics referrer allow list) into inline scripts.
  eleventyConfig.addFilter("json", (value) => JSON.stringify(value));

  return {
    dir: {
      input: "src",
      output: "dist",
    },
  };
};
