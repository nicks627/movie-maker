type SubtitleSourceInput = {
  text?: string;
  speechText?: string;
  subtitleText?: string;
};

const isNonEmptyText = (value: string | undefined): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

export const getBottomSubtitleText = ({
  speechText,
  text,
  subtitleText,
}: SubtitleSourceInput) => {
  if (isNonEmptyText(speechText)) {
    return speechText;
  }

  if (isNonEmptyText(text)) {
    return text;
  }

  if (isNonEmptyText(subtitleText)) {
    return subtitleText;
  }

  return '';
};
