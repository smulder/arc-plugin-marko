require("marko/compiler").configure({ writeToDisk: false });

// Lazily-loaded if using arc
let arc;

const getDefaultBuildConfig = require("./getDefaultBuildConfig");

function route(template, data, onDone, onError) {
  return function(req, res) {
    let renderPromise = template // eslint-disable-line no-unused-vars
      .render(data)
      .then(out => res({ html: out.getOutput() }));

    if (onDone) {
      renderPromise = renderPromise.then(onDone);
    }

    renderPromise = renderPromise.catch(
      onError ||
        function(err) {
          console.error("Error rendering template: ", err);
          res({ status: 500 });
        }
    );
  };
}

let lassoConfigured = false;

exports.run = function({ template, buildConfig, store, data, onDone, onError, req, res }) {
	res.startTime('Bucket Routing');
  if (!lassoConfigured) {
    const config = Object.assign(
      {},
      buildConfig || getDefaultBuildConfig(process.cwd()),
      {
        loadPrebuild: true
      }
    );

    require("lasso").configure(config);
    lassoConfigured = true;
  }

  function ExpRes({html, status}){
	  res.endTime('Bucket Routing');
	  res.send(html);
  }

  if(!store || store == 'AWS'){
	  if (!arc) arc = require("@arc/functions");
	  return arc.html.get(route(template, data, onDone, onError));
  }else if(store == 'GCS'){
	  // Directly send the response for now via (ExpRes).
	  // Future implementation would point to the Google Cloud Storage Route directly.
	  route(template, data, onDone, onError)(req,ExpRes);
  }
};
