import { PropertyGrid, PropertyGroup, TextProperty, DisplayProperty, CheckBoxProperty, NumberProperty, IntegerProperty, SelectProperty } from '../../../third_party';
import SetGeometryCommand from '../../../command/SetGeometryCommand';

/**
 * 全屏抗锯齿(SSAA)组件
 * @author tengge / https://github.com/tengge1
 */
class SsaaComponent extends React.Component {
    constructor(props) {
        super(props);

        this.selected = null;

        this.sampleLevel = {
            0: L_ONE_SAMPLE,
            1: L_TWO_SAMPLES,
            2: L_FOUR_SAMPLES,
            3: L_EIGHT_SAMPLES,
            4: L_SIXTEEN_SAMPLES,
            5: L_THIRTYTWO_SAMPLES,
        };

        this.state = {
            show: false,
            expanded: true,
            enabled: false,
            sampleLevel: 3,
            unbiased: true,
        };

        this.handleExpand = this.handleExpand.bind(this);
        this.handleUpdate = this.handleUpdate.bind(this);

        this.handleChange = this.handleChange.bind(this);
    }

    render() {
        const { show, expanded, enabled, sampleLevel, unbiased } = this.state;

        if (!show) {
            return null;
        }

        return <PropertyGroup title={L_SSAA} show={show} expanded={expanded} onExpand={this.handleExpand}>
            <CheckBoxProperty label={L_ENABLE_STATE} name={'enabled'} value={enabled} onChange={this.handleChange}></CheckBoxProperty>
            <SelectProperty label={'等级'} options={this.sampleLevel} name={'sampleLevel'} value={sampleLevel} onChange={this.handleChange}></SelectProperty>
            <CheckBoxProperty label={L_UNBIASED} name={'unbiased'} value={unbiased} onChange={this.handleChange}></CheckBoxProperty>
        </PropertyGroup>;
    }

    componentDidMount() {
        app.on(`objectSelected.SsaaComponent`, this.handleUpdate);
        app.on(`objectChanged.SsaaComponent`, this.handleUpdate);
    }

    handleExpand(expanded) {
        this.setState({
            expanded,
        });
    }

    handleUpdate() {
        const editor = app.editor;

        if (!editor.selected || editor.selected !== editor.scene) {
            this.setState({
                show: false,
            });
            return;
        }

        this.selected = editor.selected;

        let scene = this.selected;
        let postProcessing = scene.userData.postProcessing || {};

        let state = {
            show: true,
            enabled: postProcessing.ssaa ? postProcessing.ssaa.enabled : false,
            sampleLevel: postProcessing.ssaa ? postProcessing.ssaa.sampleLevel : this.state.sampleLevel,
            unbiased: postProcessing.ssaa ? postProcessing.ssaa.unbiased : this.state.unbiased,
        };

        this.setState(state);
    }

    handleChange(value, name) {
        if (value === null) {
            this.setState({
                [name]: value,
            });
            return;
        }

        const { enabled, sampleLevel, unbiased } = Object.assign({}, this.state, {
            [name]: value,
        });

        let scene = this.selected;

        scene.userData.postProcessing = scene.userData.postProcessing || {};

        Object.assign(scene.userData.postProcessing, {
            ssaa: {
                enabled,
                sampleLevel,
                unbiased,
            },
        });

        app.call(`postProcessingChanged`, this);
    }
}

export default SsaaComponent;