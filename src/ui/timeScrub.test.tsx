import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { copy } from "../copy";
import type { Stratum } from "../model/atlas";
import { TimeScrub } from "./TimeScrub";

// A dated chain matching the sample world's story.
function threeStrata(): Stratum[] {
  return [
    {
      id: "s1",
      createdAt: "2019-11-02T07:12:00.000Z",
      label: "first survey",
      derivedFrom: null,
      shapes: [],
    },
    {
      id: "s2",
      createdAt: "2021-03-14T06:40:00.000Z",
      label: "the clockmarket",
      derivedFrom: "s1",
      shapes: [],
    },
    {
      id: "s3",
      createdAt: "2023-08-27T05:55:00.000Z",
      label: "the fog stair",
      derivedFrom: "s2",
      shapes: [],
    },
  ];
}

function slider() {
  return screen.getByRole("slider", { name: copy.timeScrub.label });
}

describe("TimeScrub", () => {
  it("renders nothing with zero strata", () => {
    const { container } = render(
      <TimeScrub strata={[]} value={null} onScrub={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows Now at the newest position, no Back to now, input at max", () => {
    render(<TimeScrub strata={threeStrata()} value={null} onScrub={() => {}} />);

    expect(screen.getByText(copy.timeScrub.now)).toBeInTheDocument();
    expect(slider()).toHaveValue("2");
    expect(
      screen.queryByRole("button", { name: copy.timeScrub.backToNow }),
    ).toBeNull();
  });

  it("carries the accessible name Map history", () => {
    render(<TimeScrub strata={threeStrata()} value={null} onScrub={() => {}} />);
    expect(slider()).toHaveAccessibleName(copy.timeScrub.label);
  });

  it("reports the moved index from the newest position", () => {
    const onScrub = vi.fn();
    render(<TimeScrub strata={threeStrata()} value={null} onScrub={onScrub} />);

    fireEvent.change(slider(), { target: { value: "0" } });
    expect(onScrub).toHaveBeenCalledWith(0);
  });

  it("maps the max position back to null (now), never the raw index", () => {
    const onScrub = vi.fn();
    // Start at a past position so moving to the max is a real change.
    render(<TimeScrub strata={threeStrata()} value={0} onScrub={onScrub} />);

    fireEvent.change(slider(), { target: { value: "2" } });
    expect(onScrub).toHaveBeenCalledWith(null);
  });

  it("shows a dated readout and aria-valuetext at a past position", () => {
    render(<TimeScrub strata={threeStrata()} value={0} onScrub={() => {}} />);

    const expected = `${copy.timeScrub.viewingPrefix} 2 November 2019`;
    expect(screen.getByText(expected)).toBeInTheDocument();
    expect(slider()).toHaveAttribute("aria-valuetext", expected);
  });

  it("shows Back to now at a past position and returns to now on tap", () => {
    const onScrub = vi.fn();
    render(<TimeScrub strata={threeStrata()} value={0} onScrub={onScrub} />);

    const back = screen.getByRole("button", { name: copy.timeScrub.backToNow });
    fireEvent.click(back);
    expect(onScrub).toHaveBeenCalledWith(null);
  });

  it("steps to the middle stratum with its own dated readout", () => {
    render(<TimeScrub strata={threeStrata()} value={1} onScrub={() => {}} />);
    expect(
      screen.getByText(`${copy.timeScrub.viewingPrefix} 14 March 2021`),
    ).toBeInTheDocument();
    expect(slider()).toHaveValue("1");
  });

  it("degrades to a single point with one stratum and no range input", () => {
    render(
      <TimeScrub
        strata={[threeStrata()[0]]}
        value={null}
        onScrub={() => {}}
      />,
    );

    expect(screen.queryByRole("slider")).toBeNull();
    expect(
      screen.getByText(`${copy.timeScrub.drawnPrefix} 2 November 2019`),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: copy.timeScrub.backToNow }),
    ).toBeNull();
  });
});
