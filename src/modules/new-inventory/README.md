МьспартионнымучётомFEFOрриеми диичскимимгдост
##Сруамдуля

```
w/
├── c/          # Ядро: преты ханния, калькулятор сроко
├──s/       Сущ:пдк,шбл, лквити├──batch/#Прив(Batch,Mixedatch)
├── b-l/#Осттк парлках
├──operations/#Оерци:пёмеремещн,,за,назаця├──movement/   # Истрвсх движта
├──reservation/#Рееваиод заз├──alerts/#Алетп оивиям├──pricing/Цбрааниенлй/флйн/д└──orchestrator/#Кооаацй
```

## Пдмду
|омуль|О|Прбнее |
|-----------|----------|-----------|
|[core]./core/EAME.md|Пыусловй хре,ауяоров|StoragePreset,ShelfLifeCalculator ||[entities](./entities/README.md)|Бзвы сщ:InventoryProduct,ProductTemplate,StorageLocation,Storefront|Чтхя г||[batch](./batch/README.md)|Паи трашеп|Batch,MixedBatc|
|[bach-lcati](./bach-location/README.md)|Осатийвккхлокаях | BatchLocation ||[operations](./operations/README.md)| Все складскпец| Receiving, Trnsfe, WrieOff,Return, Audit, Cnsolidain|
| [movmn](./movement/README.md|Иридвжеий|Movement (удт-лг)|
|[reservation](./reservation/README.md|Рерирниедзкаы|Reservation(FEFO) ||[alerts](./alerts/README.md)|Аыокиуслиям|InventoryAlert|
|[pricing]./pricing/README.md|Цбазвае | Сикржаикип су |
| [orchestrator](./orchestrator/README.md)|Кордитрпецй|InventoryOrchestrator|
##КючцпцПинйучёт
Кжарёксдё**прюBatch) с дтй стечнязакпочнйой.Остапартийхнятсяв**BatchLocation**—пвязапари кккретйлции.

### FEFOFisExpi, Fist OПзвии дженчлбся пии бжйшиммистечя.
##Еиныйстк
Оттв=сумма`quaiy`хкныхLдляэтогооваи.Нетотдльгпя "тато"—овгдгегрует.
##Мгкор
Присзанииатоваррзевируея(`evedQunity`вBatchLocation),нофизическинепеемещеся дсбк.EnitiesINVENTORY_PRODUCT_PORT, InvenoryProdut
 PPtECEIVING_PORT, R
 TANSFR
 WRIE_OF
 EURN
 AUDICmadsQuesInyoducCmmadsnventoryrductQueis,Batcommands, BthQsRcivinmma
```##Связ угмодул

```ne-
    │    ├──→Sh(l: ) ├──→Sel(влелецпродктов и пртй)├──→O,сисниепбоке└──→yктыполяе опи)```
ФйФ|Описиеwvnty.ml. ГлавныйNeJSмодульdx.BlxIMPLEMENTATIONPLAN.mПналцих)||sv.md`|Ахеуыб|