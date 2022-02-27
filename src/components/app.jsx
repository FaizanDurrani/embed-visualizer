import React from 'react';
import { SketchPicker } from 'react-color';

import Button from './button';
import ModalContainer from './modalcontainer';
import AboutModal from './aboutmodal';
import CodeModal from './codemodal';
import WarningModal from './warningmodal';
import CodeMirror from './codemirror';
import DiscordView from './discordview';
import yaml from 'js-yaml'

import Ajv from 'ajv';
import {
  botMessageSchema,
  webhookMessageSchema,
  registerKeywords,
  stringifyErrors,
} from '../validation';

import {
  extractRGB,
  combineRGB,
} from '../color';


const ajv = registerKeywords(new Ajv({ allErrors: true }));
const validators = {
  regular: ajv.compile(botMessageSchema),
  webhook: ajv.compile(webhookMessageSchema),
};

function FooterButton(props) {
  return <Button {...props} className='shadow-1 shadow-hover-2 shadow-up-hover' />;
}

const initialEmbed = {};

// this is just for convenience.
// TODO: vary this more?
const initialCode = ''

const webhookExample = '';

const App = React.createClass({
  // TODO: serialize input, webhookMode, compactMode and darkTheme to query string?

  getInitialState() {
    return {
      webhookMode: true,
      compactMode: false,
      darkTheme: true,
      currentModal: null,
      input: initialCode,
      data: {},
      error: null,
      colorPickerShowing: false,
      embedColor: extractRGB(0),

      // TODO: put in local storage?
      webhookExampleWasShown: false,
    };
  },

  validateInput(input, webhookMode) {
    let parsed;
    let isValid = false;
    let error = '';

    try {
      parsed = yaml.load(input);
      isValid = parsed;
    } catch (e) {
      error = e.message;
    }

    let data = isValid ? parsed : this.state.data;

    let embedColor = { r: 0, g: 0, b: 0 };
    if (webhookMode && isValid && data.embeds && data.embeds[0]) {
      embedColor = extractRGB(data.embeds[0].color);
    } else if (!webhookMode && isValid && data.embed) {
      embedColor = extractRGB(data.embed.color);
    }

    // we set all these here to avoid some re-renders.
    // maybe it's okay (and if we ever want to
    // debounce validation, we need to take some of these out)
    // but for now that's what we do.
    this.setState({ input, data, error, webhookMode, embedColor });
  },

  componentWillMount() {
    this.validateInput(this.state.input, this.state.webhookMode);
  },

  onCodeChange(value, change) {
    // for some reason this fires without the value changing...?
    if (value !== this.state.input) {
      this.validateInput(value, this.state.webhookMode);
    }
  },

  openAboutModal() {
    this.setState({ currentModal: AboutModal });
  },

  openCodeModal() {
    this.setState({ currentModal: CodeModal });
  },

  closeModal() {
    this.setState({ currentModal: null });
  },

  toggleWebhookMode() {
    if (!this.state.webhookExampleWasShown) {
      this.setState({ currentModal: WarningModal });
    } else {
      this.validateInput(this.state.input, !this.state.webhookMode);
    }
  },

  displayWebhookExample() {
    this.setState({ currentModal: null, webhookExampleWasShown: true });
    this.validateInput(webhookExample, true);
  },

  dismissWebhookExample() {
    this.setState({ currentModal: null, webhookExampleWasShown: true });
    this.validateInput(this.state.input, true);
  },

  toggleTheme() {
    this.setState({ darkTheme: !this.state.darkTheme });
  },

  toggleCompactMode() {
    this.setState({ compactMode: !this.state.compactMode });
  },
  
  openColorPicker() {
    this.setState({ colorPickerShowing: !this.state.colorPickerShowing });
  },
  
  colorChange(color) {
    let val = combineRGB(color.rgb.r, color.rgb.g, color.rgb.b);
    if (val === 0) val = 1; // discord wont accept 0
    const input = this.state.input.replace(/color\s*:\s*0x[0-9A-Fa-f]+/gi, 'color: 0x' + color.hex.substring(1));
    this.validateInput(input, this.state.webhookMode);
  },

  render() {
    const webhookModeLabel = `${this.state.webhookMode ? 'Dis' : 'En'}able webhook mode`;
    const themeLabel = `${this.state.darkTheme ? 'Light' : 'Dark'} theme`;
    const compactModeLabel = `${this.state.compactMode ? 'Cozy' : 'Compact'} mode`;
    const colorPickerLabel = `${!this.state.colorPickerShowing ? 'Open' : 'Close'} color picker`;

    const colorPicker = this.state.colorPickerShowing ? (
      <div style={{
        position: 'absolute',
        bottom: '45px',
        marginLeft: '-25px',
      }}>
        <SketchPicker
          color={this.state.embedColor}
          onChange={this.colorChange}
          disableAlpha={true}
        />
      </div>
    ) : null;
    
    return (
      <main className='vh-100-l bg-blurple open-sans'>

        <div className='h-100 flex flex-column'>
          <footer className='w-100 pa3 tc white'>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <FooterButton label={colorPickerLabel} onClick={this.openColorPicker} />
              {colorPicker}
            </div>
            <FooterButton label={themeLabel} onClick={this.toggleTheme} />
            <FooterButton label={compactModeLabel} onClick={this.toggleCompactMode} />
            <FooterButton label='About' onClick={this.openAboutModal} />
          </footer>
          <section className='flex-l flex-auto'>
            <div className='vh-100 h-auto-l w-100 w-50-l pa4 pr3-l pbt-l pt0'>
              <CodeMirror
                onChange={this.onCodeChange}
                value={this.state.input}
                theme={this.state.darkTheme ? 'one-dark' : 'default'}
              />
            </div>
            <div className='vh-100 h-auto-l w-100 w-50-l pa4 pl3-l pt0'>
              <DiscordView
                data={this.state.data}
                error={this.state.error}
                webhookMode={this.state.webhookMode}
                darkTheme={this.state.darkTheme}
                compactMode={this.state.compactMode}
              />
            </div>
          </section>

        </div>

        <ModalContainer
          yes={this.displayWebhookExample}
          no={this.dismissWebhookExample}
          close={this.closeModal}
          data={this.state.data}
          webhookMode={this.state.webhookMode}
          darkTheme={this.state.darkTheme}
          hasError={this.state.error !== null && this.state.error !== ''}
          currentModal={this.state.currentModal}
        />
      </main>
    );
  },
});


export default App;
