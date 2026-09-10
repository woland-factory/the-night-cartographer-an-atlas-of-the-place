import { Component, type ReactNode } from "react";
import { copy } from "../copy";
import { reportError } from "../hooks/errors";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

// Designed error state. It reports the Error (only the Error) to the optional
// error hook and offers a single way out.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    reportError(error);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="page">
          <p className="wordmark">{copy.wordmark}</p>
          <div className="empty" role="alert">
            <p className="empty__title">{copy.errorBoundary.title}</p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={this.handleReload}
            >
              {copy.errorBoundary.action}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
