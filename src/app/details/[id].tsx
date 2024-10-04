// LIBS
import { useEffect, useRef, useState } from "react";
import { Alert, Keyboard, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Bottom from "@gorhom/bottom-sheet";
import dayjs from "dayjs";

//DATABASE
import { useGoalRepository } from "@/database/useGoalRepository";
import { useTransactionRepository } from "@/database/useTransactionRepository";

// COMPONENTS
import { Input } from "@/components/Input";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { Loading } from "@/components/Loading";
import { Progress } from "@/components/Progress";
import { BackButton } from "@/components/BackButton";
import { BottomSheet } from "@/components/BottomSheet";
import { Transactions } from "@/components/Transactions";
import { TransactionProps } from "@/components/Transaction";
import { TransactionTypeSelect } from "@/components/TransactionTypeSelect";

// UTILS
import { currencyFormat } from "@/utils/currencyFormat";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

type Details = {
  name: string;
  total: string;
  current: string;
  percentage: number;
  transactions: TransactionProps[];
};

export default function Details() {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [type, setType] = useState<"up" | "down">("up");
  const [goal, setGoal] = useState<Details>({} as Details);

  // PARAMS
  const routeParams = useLocalSearchParams();
  const goalId = Number(routeParams.id);

  //DATABASE
  const useGoal = useGoalRepository();
  const useTransaction = useTransactionRepository();

  // BOTTOM SHEET
  const bottomSheetRef = useRef<Bottom>(null);
  const handleBottomSheetOpen = () => bottomSheetRef.current?.expand();
  const handleBottomSheetClose = () => bottomSheetRef.current?.snapToIndex(0);

  function handleDeleteGoal() {
    Alert.alert("Aviso Importante", "Deseja realmente apagar sua meta?", [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Sim",
        onPress: () => {
          useGoal.removeGoal(goalId);
          useTransaction.removeTransaction(goalId);
          router.back();
        },
      },
    ]);
  }

  function fetchDetails() {
    try {
      if (goalId) {
        const goal = useGoal.showGoal(goalId);
        const transactions = useTransaction.findByGoal(goalId);

        if (!goal || !transactions) {
          return router.back();
        }

        setGoal({
          name: goal.name,
          current: currencyFormat(goal.current),
          total: currencyFormat(goal.total),
          percentage: (goal.current / goal.total) * 100,
          transactions: transactions.map((item) => ({
            ...item,
            date: dayjs(item.created_at).format("DD/MM/YYYY [às] HH:mm"),
          })),
        });

        setIsLoading(false);
      }
    } catch (error) {
      console.log(error);
    }
  }

  async function handleNewTransaction() {
    try {
      let amountAsNumber = Number(amount.replace(",", "."));

      if (isNaN(amountAsNumber)) {
        return Alert.alert("Erro", "Valor inválido.");
      }

      if (type === "down") {
        amountAsNumber = amountAsNumber * -1;
      }

      useTransaction.create({ goalId, amount: amountAsNumber });

      Alert.alert("Sucesso", "Transação registrada!");

      handleBottomSheetClose();
      Keyboard.dismiss();

      setAmount("");
      setType("up");
      fetchDetails();
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    fetchDetails();
  }, []);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <View className="flex-1 p-8 pt-20">
      <View style={styles.content}>
        <BackButton />
        <MaterialIcons
          name="delete"
          size={32}
          color="#FFFFFF"
          onPress={handleDeleteGoal}
        />
      </View>

      <Header title={goal.name} subtitle={`${goal.current} de ${goal.total}`} />

      <Progress percentage={goal.percentage} />

      <Transactions transactions={goal.transactions} />

      <Button title="Nova transação" onPress={handleBottomSheetOpen} />

      <BottomSheet
        ref={bottomSheetRef}
        title="Nova transação"
        snapPoints={[0.01, 284]}
        onClose={handleBottomSheetClose}
      >
        <TransactionTypeSelect onChange={setType} selected={type} />

        <Input
          placeholder="Valor"
          keyboardType="numeric"
          onChangeText={setAmount}
          value={amount}
        />

        <Button title="Confirmar" onPress={handleNewTransaction} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
