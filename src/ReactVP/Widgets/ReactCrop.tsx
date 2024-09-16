import {
  ReactCrop as RawCrop,
  type ReactCropProps as RawCropProps
} from 'react-image-crop';

export { type Crop } from 'react-image-crop';

interface IReactCropProps extends RawCropProps {
  scale?: number;
}

class ReactCrop extends RawCrop {
  props!: IReactCropProps;

  getBox(): any {
    const box = super.getBox();
    const { scale } = this.props;
    if (scale !== undefined && scale !== 0) {
      box.width /= scale;
      box.height /= scale;
    }
    return box;
  }
}

export default ReactCrop;
