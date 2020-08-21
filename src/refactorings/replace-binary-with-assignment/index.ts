import {
  replaceBinaryWithAssignment,
  canReplaceBinaryWithAssignment
} from "./replace-binary-with-assignment";

import * as t from "../../ast";
import { DeprecatedRefactoringWithActionProvider } from "../../types";

const config: DeprecatedRefactoringWithActionProvider = {
  command: {
    key: "replaceBinaryWithAssignment",
    operation: replaceBinaryWithAssignment,
    title: "Replace Binary With Assignment"
  },
  actionProvider: {
    message: "Replace binary with assignment",
    isPreferred: true,
    createVisitor: canReplaceBinaryWithAssignment,
    updateMessage(path: t.NodePath) {
      const { node } = path as t.NodePath<t.AssignmentExpression>;

      const binaryExpression = node.right as t.BinaryExpression;
      const operator = binaryExpression.operator;
      return `Replace = with ${operator}=`;
    }
  }
};

export default config;
