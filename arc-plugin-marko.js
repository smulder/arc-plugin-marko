const path = require("path");
const fs = require("fs-extra");
const markoCompiler = require("marko/compiler");
const markoCompile = require("@marko/compile");
const markoPrebuild = require("@marko/prebuild");
const getDefaultBuildConfig = require("./getDefaultBuildConfig");
const ok = require("assert").ok;

async function prebuildPage(page, config, extend) {
  if (extend) {
    config = Object.assign(
      {},
      getDefaultBuildConfig(path.dirname(page)),
      config
    );
  }

  //await fs.remove(config.cacheDir);

  console.log('----- prebuildling:', page);

  return markoPrebuild.run({
    pages: [page],
    config
  });
}

function findPlugin(pluginName, plugins) {
  for (const plugin of plugins) {
    if (typeof plugin === "string") {
      if (plugin === pluginName) return true;
    } else if (typeof plugin === "object") {
      if (plugin.plugin === pluginName) return true;
    }
  }
  return false;
}

async function build(config) {
  const pluginConfig = config.pluginConfig;

  ok(
    pluginConfig,
    '"pages" and "config" are required properties to use arc-plugin-marko'
  );

  let { pages, config: buildConfig, bucket, store, staticUrl, bucketDir } = pluginConfig;

  ok(pages, '"pages" is a required property to use arc-plugin-marko');

  markoCompiler.registerTaglib(
    require.resolve("@lasso/marko-taglib/marko.json")
  );

  const cwd = process.cwd();
  let extendDefault = false;

  if (buildConfig) {
    buildConfig = require(require.resolve(path.resolve(cwd, buildConfig)));
  } else {
    buildConfig = {};
    extendDefault = true;
  }

  if (!buildConfig.plugins) {
    buildConfig.plugins = ["lasso-marko"];
  } else {
    if (!findPlugin("lasso-marko", buildConfig.plugins)) {
      buildConfig.plugins.push("lasso-marko");
    }
  }

  if(bucket){
	  if(!store || store == 'AWS'){
		  if (!findPlugin("lasso-s3-writer", buildConfig.plugins)) {
		    buildConfig.plugins.push({
		      plugin: "lasso-s3-writer",
		      config: {
		        bucket,
		        logger: console.log
		      }
		    });
		  }
	  }else if(store == 'GCS'){
		  if (!findPlugin("lasso-gcs-writer", buildConfig.plugins)) {
		    buildConfig.plugins.push({
		      plugin: "lasso-gcs-writer",
		      config: {
		        bucket,
			   bucketDir,
			   staticUrl,
		        logger: console.log
		      }
		    });
		  }
	  }
  }


  const fileGlob = path.resolve(cwd, "./src/**/*.marko");

  await markoCompile.run({
    dir: cwd,
    browser: true,
    files: fileGlob
  });

  if (Array.isArray(pages)) {
    for (const page of pages) {
      await prebuildPage(page, buildConfig, extendDefault);
    }
  } else {
    await prebuildPage(pages, buildConfig, extendDefault);
  }
}

module.exports = {
  beforeCreate: build,
  beforeDeploy: build
};
