//! Bounded generated dense workloads for native arena measurement, not trained AI.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Shape {
    pub batch: usize,
    pub width: usize,
    pub classes: usize,
}

pub const SHAPES: [Shape; 12] = [
    Shape {
        batch: 1,
        width: 128,
        classes: 8,
    },
    Shape {
        batch: 4,
        width: 128,
        classes: 8,
    },
    Shape {
        batch: 1,
        width: 256,
        classes: 16,
    },
    Shape {
        batch: 4,
        width: 256,
        classes: 16,
    },
    Shape {
        batch: 1,
        width: 384,
        classes: 24,
    },
    Shape {
        batch: 4,
        width: 384,
        classes: 24,
    },
    Shape {
        batch: 2,
        width: 192,
        classes: 12,
    },
    Shape {
        batch: 3,
        width: 320,
        classes: 20,
    },
    Shape {
        batch: 2,
        width: 128,
        classes: 8,
    },
    Shape {
        batch: 3,
        width: 256,
        classes: 16,
    },
    Shape {
        batch: 2,
        width: 384,
        classes: 24,
    },
    Shape {
        batch: 8,
        width: 384,
        classes: 24,
    },
];

#[derive(Debug, PartialEq, Eq)]
pub struct Layout {
    pub inputs: usize,
    pub weights: usize,
    pub output_offset: usize,
    pub pages: usize,
}

impl Shape {
    pub fn layout(self) -> Option<Layout> {
        if !(1..=8).contains(&self.batch)
            || !(1..=384).contains(&self.width)
            || !(1..=24).contains(&self.classes)
        {
            return None;
        }
        let inputs = self.batch * self.width;
        let weights = self.classes * self.width;
        let output_offset = ((inputs + weights) * 4).next_multiple_of(8);
        let bytes = output_offset + self.batch * self.classes * 8;
        let pages = bytes.div_ceil(4096);
        (pages <= 16).then_some(Layout {
            inputs,
            weights,
            output_offset,
            pages,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bounds_precede_arithmetic_and_outputs_are_aligned() {
        for shape in [
            Shape {
                batch: usize::MAX,
                width: 2,
                classes: 2,
            },
            Shape {
                batch: 1,
                width: 0,
                classes: 2,
            },
            Shape {
                batch: 1,
                width: 385,
                classes: 2,
            },
            Shape {
                batch: 1,
                width: 2,
                classes: 25,
            },
        ] {
            assert_eq!(shape.layout(), None);
        }
        let odd = Shape {
            batch: 2,
            width: 1,
            classes: 1,
        }
        .layout()
        .unwrap();
        assert_eq!(odd.output_offset, 16);
        assert_eq!(odd.pages, 1);
        let pages: [usize; 12] = core::array::from_fn(|i| SHAPES[i].layout().unwrap().pages);
        assert_eq!(pages, [2, 2, 5, 6, 10, 11, 3, 8, 2, 5, 10, 13]);
    }
}
