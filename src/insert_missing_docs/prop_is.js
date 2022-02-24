import { posix } from 'path';
import { insert_new_prop } from './utils.js';

const path = posix;

const docs_list = [ // in subdir shadows/
  'lights/shadows/DirectionalLightShadow.html',  
  'lights/shadows/SpotLightShadow.html',
  'lights/shadows/PointLightShadow.html'
];

const new_prop_name_fn = ({ relpath_to_docs }) =>
  'is' + path.basename(relpath_to_docs, '.html');

const new_full_text_fn = ({ new_prop_name }) => `\n
\t\t<h3>[property:Boolean ${new_prop_name}]</h3>
\t\t<p>
\t\t\tRead-only flag to check whether a given object is of type [name].
\t\t</p>`;

insert_new_prop({ docs_list, new_prop_name_fn, new_full_text_fn });
