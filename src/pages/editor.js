import React from 'react';
import SbEditable from 'storyblok-react';
import Components from '../components/components.js';
import config from '../../gatsby-config';
import Navi from '../components/navi.js';

const sbConfigs = config.plugins.filter((item) => item.resolve === 'gatsby-source-storyblok');
const sbConfig = sbConfigs.length > 0 ? sbConfigs[0] : {};

const loadStoryblokBridge = function (cb) {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = `//app.storyblok.com/f/storyblok-latest.js?t=${sbConfig.options.accessToken}`;
  script.onload = cb;
  document.getElementsByTagName('head')[0].appendChild(script);
};

const getParam = function (val) {
  let result = '';
  let tmp = [];

  window.location.search
    .substr(1)
    .split('&')
    .forEach((item) => {
      tmp = item.split('=');
      if (tmp[0] === val) {
        result = decodeURIComponent(tmp[1]);
      }
    });

  return result;
};

class StoryblokEntry extends React.Component {
  constructor(props) {
    super(props);
    this.state = { story: null, globalNavi: { content: {} } };
  }

  componentDidMount() {
    loadStoryblokBridge(() => { this.initStoryblokEvents(); });
  }

  loadStory(payload) {
    window.storyblok.get({
      slug: getParam('path'),
      version: 'draft',
      resolve_relations: sbConfig.options.resolveRelations || [],
    }, (data) => {
      this.setState({ story: data.story });
      this.loadGlovalNavi(data.story.lang);
    });
  }

  loadGlovalNavi(lang) {
    const language = lang === 'default' ? '' : `${lang}/`;
    window.storyblok.get({
      slug: `${language}global-navi`,
      version: 'draft',
    }, (data) => {
      this.setState({ globalNavi: data.story });
    });
  }

  initStoryblokEvents() {
    this.loadStory({ storyId: getParam('path') });

    const sb = window.storyblok;

    sb.on(['change', 'published'], (payload) => {
      this.loadStory(payload);
    });

    sb.on('input', (payload) => {
      if (this.state.story && payload.story.id === this.state.story.id) {
        payload.story.content = sb.addComments(payload.story.content, payload.story.id);
        this.setState({ story: payload.story });
      }
    });

    sb.pingEditor(() => {
      if (sb.inEditor) {
        sb.enterEditmode();
      }
    });
  }

  render() {
    if (this.state.story == null) {
      return (<div />);
    }

    const { content } = this.state.story;
    const globalNavi = this.state.globalNavi.content;

    return (
      <SbEditable content={content}>
        <div>
          <Navi blok={globalNavi} />
          {React.createElement(Components(content.component), { key: content._uid, blok: content })}
        </div>
      </SbEditable>
    );
  }
}

export default StoryblokEntry;
